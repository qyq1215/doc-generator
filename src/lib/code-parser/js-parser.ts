import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import {
  CodeMetadata,
  ClassInfo,
  FunctionInfo,
  InterfaceInfo,
  ImportInfo,
  ExportInfo,
  CommentInfo,
  PropertyInfo,
  MethodInfo,
  ParamInfo,
} from '../types';

/**
 * 解析 JavaScript/TypeScript 代码
 */
export function parseJavaScript(
  code: string,
  fileName: string,
  language: 'javascript' | 'typescript'
): CodeMetadata {
  const isTypeScript = language === 'typescript' || fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  
  const metadata: CodeMetadata = {
    fileName,
    language,
    classes: [],
    functions: [],
    interfaces: [],
    imports: [],
    exports: [],
    comments: [],
    rawCode: code,
  };

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        ...(isTypeScript ? ['typescript' as const] : []),
        'decorators-legacy',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
      ],
      errorRecovery: true,
    });

    // 提取注释
    if (ast.comments) {
      metadata.comments = ast.comments.map(comment => ({
        type: comment.type === 'CommentLine' ? 'line' : 
              comment.value.startsWith('*') ? 'jsdoc' : 'block',
        content: comment.value.trim(),
        startLine: comment.loc?.start.line || 0,
        endLine: comment.loc?.end.line || 0,
      }));
    }

    // 遍历 AST
    traverse(ast, {
      // 提取导入
      ImportDeclaration(path) {
        const importInfo: ImportInfo = {
          source: path.node.source.value,
          specifiers: [],
          isDefault: false,
        };

        path.node.specifiers.forEach(spec => {
          if (t.isImportDefaultSpecifier(spec)) {
            importInfo.isDefault = true;
            importInfo.specifiers.push(spec.local.name);
          } else if (t.isImportSpecifier(spec)) {
            const imported = t.isIdentifier(spec.imported) 
              ? spec.imported.name 
              : spec.imported.value;
            importInfo.specifiers.push(imported);
          } else if (t.isImportNamespaceSpecifier(spec)) {
            importInfo.specifiers.push(`* as ${spec.local.name}`);
          }
        });

        metadata.imports.push(importInfo);
      },

      // 提取类
      ClassDeclaration(path) {
        const classInfo = extractClassInfo(path.node, metadata.comments);
        metadata.classes.push(classInfo);
        
        // 检查是否导出
        const parent = path.parent;
        if (t.isExportDefaultDeclaration(parent)) {
          metadata.exports.push({
            name: classInfo.name,
            isDefault: true,
            type: 'class',
          });
        } else if (t.isExportNamedDeclaration(parent)) {
          metadata.exports.push({
            name: classInfo.name,
            isDefault: false,
            type: 'class',
          });
        }
      },

      // 提取函数声明
      FunctionDeclaration(path) {
        if (path.node.id) {
          const funcInfo = extractFunctionInfo(path.node, metadata.comments);
          metadata.functions.push(funcInfo);
          
          // 检查是否导出
          const parent = path.parent;
          if (t.isExportDefaultDeclaration(parent)) {
            metadata.exports.push({
              name: funcInfo.name,
              isDefault: true,
              type: 'function',
            });
          } else if (t.isExportNamedDeclaration(parent)) {
            metadata.exports.push({
              name: funcInfo.name,
              isDefault: false,
              type: 'function',
            });
          }
        }
      },

      // 提取箭头函数和函数表达式（仅顶层变量）
      VariableDeclaration(path) {
        // 只处理顶层变量
        if (!t.isProgram(path.parent) && !t.isExportNamedDeclaration(path.parent)) {
          return;
        }

        path.node.declarations.forEach(decl => {
          if (t.isIdentifier(decl.id) && decl.init) {
            if (t.isArrowFunctionExpression(decl.init) || t.isFunctionExpression(decl.init)) {
              const funcInfo = extractArrowFunctionInfo(decl.id.name, decl.init, metadata.comments);
              metadata.functions.push(funcInfo);
              
              // 检查是否导出
              const parent = path.parent;
              if (t.isExportNamedDeclaration(parent)) {
                metadata.exports.push({
                  name: funcInfo.name,
                  isDefault: false,
                  type: 'function',
                });
              }
            }
          }
        });
      },

      // 提取 TypeScript 接口
      TSInterfaceDeclaration(path) {
        const interfaceInfo = extractInterfaceInfo(path.node, metadata.comments);
        metadata.interfaces.push(interfaceInfo);
        
        const parent = path.parent;
        if (t.isExportNamedDeclaration(parent)) {
          metadata.exports.push({
            name: interfaceInfo.name,
            isDefault: false,
            type: 'interface',
          });
        }
      },

      // 提取导出声明
      ExportDefaultDeclaration(path) {
        if (t.isIdentifier(path.node.declaration)) {
          metadata.exports.push({
            name: path.node.declaration.name,
            isDefault: true,
            type: 'variable',
          });
        }
      },

      ExportNamedDeclaration(path) {
        // 处理 export { a, b } 形式
        path.node.specifiers.forEach(spec => {
          if (t.isExportSpecifier(spec)) {
            const exported = t.isIdentifier(spec.exported) 
              ? spec.exported.name 
              : spec.exported.value;
            metadata.exports.push({
              name: exported,
              isDefault: false,
              type: 'variable',
            });
          }
        });
      },
    });
  } catch (error) {
    console.error('解析代码时出错:', error);
    // 返回基本元数据，即使解析失败
  }

  return metadata;
}

/**
 * 提取类信息
 */
function extractClassInfo(node: t.ClassDeclaration, comments: CommentInfo[]): ClassInfo {
  const classInfo: ClassInfo = {
    name: node.id?.name || 'Anonymous',
    properties: [],
    methods: [],
    startLine: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
  };

  // 提取父类
  if (node.superClass && t.isIdentifier(node.superClass)) {
    classInfo.superClass = node.superClass.name;
  }

  // 提取实现的接口（TypeScript）
  if (node.implements) {
    classInfo.implements = node.implements.map(impl => {
      if (t.isTSExpressionWithTypeArguments(impl) && t.isIdentifier(impl.expression)) {
        return impl.expression.name;
      }
      return 'unknown';
    });
  }

  // 提取类成员
  node.body.body.forEach(member => {
    if (t.isClassProperty(member) || t.isClassPrivateProperty(member)) {
      const propInfo: PropertyInfo = {
        name: t.isIdentifier(member.key) ? member.key.name : 
              t.isPrivateName(member.key) ? `#${member.key.id.name}` : 'unknown',
        isOptional: false,
        isReadonly: member.readonly || false,
      };

      if (member.typeAnnotation && t.isTSTypeAnnotation(member.typeAnnotation)) {
        propInfo.type = extractTypeString(member.typeAnnotation.typeAnnotation);
      }

      classInfo.properties.push(propInfo);
    } else if (t.isClassMethod(member) || t.isClassPrivateMethod(member)) {
      const methodInfo: MethodInfo = {
        name: t.isIdentifier(member.key) ? member.key.name :
              t.isPrivateName(member.key) ? `#${member.key.id.name}` : 'unknown',
        params: extractParams(member.params),
        isAsync: member.async,
        isStatic: member.static,
        visibility: t.isClassPrivateMethod(member) ? 'private' : 
                    member.accessibility || 'public',
      };

      if (member.returnType && t.isTSTypeAnnotation(member.returnType)) {
        methodInfo.returnType = extractTypeString(member.returnType.typeAnnotation);
      }

      classInfo.methods.push(methodInfo);
    }
  });

  // 提取关联的注释
  classInfo.comments = findAssociatedComments(classInfo.startLine, comments);

  return classInfo;
}

/**
 * 提取函数信息
 */
function extractFunctionInfo(
  node: t.FunctionDeclaration,
  comments: CommentInfo[]
): FunctionInfo {
  const funcInfo: FunctionInfo = {
    name: node.id?.name || 'anonymous',
    params: extractParams(node.params),
    isAsync: node.async,
    isExported: false,
    startLine: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
  };

  if (node.returnType && t.isTSTypeAnnotation(node.returnType)) {
    funcInfo.returnType = extractTypeString(node.returnType.typeAnnotation);
  }

  // 提取关联的注释
  funcInfo.comments = findAssociatedComments(funcInfo.startLine, comments);

  return funcInfo;
}

/**
 * 提取箭头函数信息
 */
function extractArrowFunctionInfo(
  name: string,
  node: t.ArrowFunctionExpression | t.FunctionExpression,
  comments: CommentInfo[]
): FunctionInfo {
  const funcInfo: FunctionInfo = {
    name,
    params: extractParams(node.params),
    isAsync: node.async,
    isExported: false,
    startLine: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
  };

  if (node.returnType && t.isTSTypeAnnotation(node.returnType)) {
    funcInfo.returnType = extractTypeString(node.returnType.typeAnnotation);
  }

  // 提取关联的注释
  funcInfo.comments = findAssociatedComments(funcInfo.startLine, comments);

  return funcInfo;
}

/**
 * 提取接口信息
 */
function extractInterfaceInfo(
  node: t.TSInterfaceDeclaration,
  comments: CommentInfo[]
): InterfaceInfo {
  const interfaceInfo: InterfaceInfo = {
    name: node.id.name,
    properties: [],
    methods: [],
    startLine: node.loc?.start.line || 0,
    endLine: node.loc?.end.line || 0,
  };

  // 提取继承的接口
  if (node.extends) {
    interfaceInfo.extends = node.extends.map(ext => {
      if (t.isIdentifier(ext.expression)) {
        return ext.expression.name;
      }
      return 'unknown';
    });
  }

  // 提取接口成员
  node.body.body.forEach(member => {
    if (t.isTSPropertySignature(member)) {
      const propInfo: PropertyInfo = {
        name: t.isIdentifier(member.key) ? member.key.name : 'unknown',
        isOptional: member.optional || false,
        isReadonly: member.readonly || false,
      };

      if (member.typeAnnotation && t.isTSTypeAnnotation(member.typeAnnotation)) {
        propInfo.type = extractTypeString(member.typeAnnotation.typeAnnotation);
      }

      interfaceInfo.properties.push(propInfo);
    } else if (t.isTSMethodSignature(member)) {
      const methodSig = {
        name: t.isIdentifier(member.key) ? member.key.name : 'unknown',
        params: member.parameters ? extractParams(member.parameters) : [],
        returnType: member.typeAnnotation && t.isTSTypeAnnotation(member.typeAnnotation)
          ? extractTypeString(member.typeAnnotation.typeAnnotation)
          : undefined,
      };
      interfaceInfo.methods.push(methodSig);
    }
  });

  // 提取关联的注释
  interfaceInfo.comments = findAssociatedComments(interfaceInfo.startLine, comments);

  return interfaceInfo;
}

/**
 * 提取函数参数
 */
function extractParams(params: (t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty)[]): ParamInfo[] {
  return params.map(param => {
    if (t.isIdentifier(param)) {
      const paramInfo: ParamInfo = {
        name: param.name,
        isOptional: param.optional || false,
      };

      if (param.typeAnnotation && t.isTSTypeAnnotation(param.typeAnnotation)) {
        paramInfo.type = extractTypeString(param.typeAnnotation.typeAnnotation);
      }

      return paramInfo;
    } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
      return {
        name: param.left.name,
        isOptional: true,
        defaultValue: 'has default',
      };
    } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
      return {
        name: `...${param.argument.name}`,
        isOptional: false,
      };
    }
    
    return {
      name: 'unknown',
      isOptional: false,
    };
  });
}

/**
 * 提取类型字符串
 */
function extractTypeString(type: t.TSType): string {
  if (t.isTSStringKeyword(type)) return 'string';
  if (t.isTSNumberKeyword(type)) return 'number';
  if (t.isTSBooleanKeyword(type)) return 'boolean';
  if (t.isTSAnyKeyword(type)) return 'any';
  if (t.isTSVoidKeyword(type)) return 'void';
  if (t.isTSNullKeyword(type)) return 'null';
  if (t.isTSUndefinedKeyword(type)) return 'undefined';
  if (t.isTSUnknownKeyword(type)) return 'unknown';
  if (t.isTSNeverKeyword(type)) return 'never';
  
  if (t.isTSTypeReference(type) && t.isIdentifier(type.typeName)) {
    let typeName = type.typeName.name;
    if (type.typeParameters && type.typeParameters.params.length > 0) {
      const params = type.typeParameters.params.map(p => extractTypeString(p)).join(', ');
      typeName += `<${params}>`;
    }
    return typeName;
  }

  if (t.isTSArrayType(type)) {
    return `${extractTypeString(type.elementType)}[]`;
  }

  if (t.isTSUnionType(type)) {
    return type.types.map(t => extractTypeString(t)).join(' | ');
  }

  if (t.isTSFunctionType(type)) {
    const params = type.parameters
      .map(p => t.isIdentifier(p) ? p.name : 'arg')
      .join(', ');
    const returnType = type.typeAnnotation && t.isTSTypeAnnotation(type.typeAnnotation)
      ? extractTypeString(type.typeAnnotation.typeAnnotation)
      : 'void';
    return `(${params}) => ${returnType}`;
  }

  if (t.isTSTypeLiteral(type)) {
    return 'object';
  }

  return 'unknown';
}

/**
 * 查找与指定行关联的注释
 */
function findAssociatedComments(line: number, comments: CommentInfo[]): string[] {
  // 查找紧邻在指定行上方的注释
  return comments
    .filter(comment => comment.endLine === line - 1 || comment.endLine === line - 2)
    .map(comment => comment.content.replace(/^\*+\s*/gm, '').trim());
}

