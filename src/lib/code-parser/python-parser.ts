import {
  CodeMetadata,
  ClassInfo,
  FunctionInfo,
  ImportInfo,
  CommentInfo,
  PropertyInfo,
  MethodInfo,
  ParamInfo,
} from '../types';

/**
 * 基于正则表达式的 Python 代码解析器
 * 注意：这是一个简化版本，用于基本的代码结构提取
 * 对于更复杂的解析需求，建议使用 tree-sitter-python
 */
export function parsePython(code: string, fileName: string): CodeMetadata {
  const metadata: CodeMetadata = {
    fileName,
    language: 'python',
    classes: [],
    functions: [],
    interfaces: [], // Python 没有接口，但有抽象类
    imports: [],
    exports: [],
    comments: [],
    rawCode: code,
  };

  const lines = code.split('\n');
  
  // 提取导入
  metadata.imports = extractPythonImports(code);
  
  // 提取注释和文档字符串
  metadata.comments = extractPythonComments(code, lines);
  
  // 提取类
  metadata.classes = extractPythonClasses(code, lines);
  
  // 提取顶层函数
  metadata.functions = extractPythonFunctions(code, lines);
  
  return metadata;
}

/**
 * 提取 Python 导入语句
 */
function extractPythonImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  
  // 匹配 import xxx 形式
  const simpleImportRegex = /^import\s+(\S+)(?:\s+as\s+(\S+))?/gm;
  let match;
  
  while ((match = simpleImportRegex.exec(code)) !== null) {
    imports.push({
      source: match[1],
      specifiers: [match[2] || match[1]],
      isDefault: true,
    });
  }
  
  // 匹配 from xxx import yyy 形式
  const fromImportRegex = /^from\s+(\S+)\s+import\s+(.+)$/gm;
  
  while ((match = fromImportRegex.exec(code)) !== null) {
    const source = match[1];
    const specifiersStr = match[2];
    
    // 解析导入的具体内容
    const specifiers = specifiersStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('#'))
      .map(s => {
        // 处理 as 别名
        const asMatch = s.match(/(\S+)\s+as\s+(\S+)/);
        return asMatch ? asMatch[2] : s;
      });
    
    imports.push({
      source,
      specifiers,
      isDefault: false,
    });
  }
  
  return imports;
}

/**
 * 提取 Python 注释
 */
function extractPythonComments(code: string, lines: string[]): CommentInfo[] {
  const comments: CommentInfo[] = [];
  
  // 提取单行注释
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      comments.push({
        type: 'line',
        content: trimmed.slice(1).trim(),
        startLine: index + 1,
        endLine: index + 1,
      });
    }
  });
  
  // 提取多行文档字符串
  const docstringRegex = /"""([\s\S]*?)"""|'''([\s\S]*?)'''/g;
  let match;
  
  while ((match = docstringRegex.exec(code)) !== null) {
    const content = (match[1] || match[2]).trim();
    const startIndex = code.slice(0, match.index).split('\n').length;
    const endIndex = code.slice(0, match.index + match[0].length).split('\n').length;
    
    comments.push({
      type: 'block',
      content,
      startLine: startIndex,
      endLine: endIndex,
    });
  }
  
  return comments;
}

/**
 * 提取 Python 类
 */
function extractPythonClasses(code: string, lines: string[]): ClassInfo[] {
  const classes: ClassInfo[] = [];
  
  // 匹配类定义
  const classRegex = /^class\s+(\w+)(?:\(([^)]*)\))?:/gm;
  let match;
  
  while ((match = classRegex.exec(code)) !== null) {
    const className = match[1];
    const inheritance = match[2];
    const startLine = code.slice(0, match.index).split('\n').length;
    
    const classInfo: ClassInfo = {
      name: className,
      properties: [],
      methods: [],
      startLine,
      endLine: startLine, // 将在后面计算
    };
    
    // 解析继承
    if (inheritance) {
      const bases = inheritance.split(',').map(s => s.trim()).filter(s => s);
      if (bases.length > 0) {
        classInfo.superClass = bases[0];
        if (bases.length > 1) {
          classInfo.implements = bases.slice(1);
        }
      }
    }
    
    // 找到类的结束位置并提取方法
    const classBody = extractPythonBlock(lines, startLine - 1);
    classInfo.endLine = startLine + classBody.length - 1;
    
    // 提取类方法
    classInfo.methods = extractClassMethods(classBody);
    
    // 提取类属性 (从 __init__ 方法中)
    classInfo.properties = extractClassProperties(classBody);
    
    // 提取类文档字符串
    const docstring = extractDocstring(classBody);
    if (docstring) {
      classInfo.comments = [docstring];
    }
    
    classes.push(classInfo);
  }
  
  return classes;
}

/**
 * 提取 Python 顶层函数
 */
function extractPythonFunctions(code: string, lines: string[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  
  // 匹配函数定义（只匹配顶层函数，即没有缩进的）
  const funcRegex = /^(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?:/gm;
  let match;
  
  while ((match = funcRegex.exec(code)) !== null) {
    const isAsync = !!match[1];
    const funcName = match[2];
    const paramsStr = match[3];
    const returnType = match[4];
    const startLine = code.slice(0, match.index).split('\n').length;
    
    // 检查是否是顶层函数（行首没有空格）
    const lineContent = lines[startLine - 1];
    if (lineContent && lineContent.match(/^\s+/)) {
      continue; // 跳过缩进的函数（类方法等）
    }
    
    const funcInfo: FunctionInfo = {
      name: funcName,
      params: parsePythonParams(paramsStr),
      returnType: returnType || undefined,
      isAsync,
      isExported: true, // Python 默认都可导出
      startLine,
      endLine: startLine,
    };
    
    // 找到函数的结束位置
    const funcBody = extractPythonBlock(lines, startLine - 1);
    funcInfo.endLine = startLine + funcBody.length - 1;
    
    // 提取函数文档字符串
    const docstring = extractDocstring(funcBody);
    if (docstring) {
      funcInfo.comments = [docstring];
    }
    
    functions.push(funcInfo);
  }
  
  return functions;
}

/**
 * 提取类方法
 */
function extractClassMethods(classBody: string[]): MethodInfo[] {
  const methods: MethodInfo[] = [];
  
  for (let i = 0; i < classBody.length; i++) {
    const line = classBody[i];
    const methodMatch = line.match(/^\s+(async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?:/);
    
    if (methodMatch) {
      const isAsync = !!methodMatch[1];
      const methodName = methodMatch[2];
      const paramsStr = methodMatch[3];
      const returnType = methodMatch[4];
      
      // 判断可见性
      let visibility: 'public' | 'private' | 'protected' = 'public';
      if (methodName.startsWith('__') && !methodName.endsWith('__')) {
        visibility = 'private';
      } else if (methodName.startsWith('_')) {
        visibility = 'protected';
      }
      
      const methodInfo: MethodInfo = {
        name: methodName,
        params: parsePythonParams(paramsStr),
        returnType: returnType || undefined,
        isAsync,
        isStatic: paramsStr.trim().startsWith('cls') || line.includes('@staticmethod'),
        visibility,
      };
      
      methods.push(methodInfo);
    }
  }
  
  return methods;
}

/**
 * 提取类属性
 */
function extractClassProperties(classBody: string[]): PropertyInfo[] {
  const properties: PropertyInfo[] = [];
  const seenProperties = new Set<string>();
  
  // 查找 __init__ 方法中的 self.xxx = 赋值
  let inInit = false;
  let initIndent = 0;
  
  for (let i = 0; i < classBody.length; i++) {
    const line = classBody[i];
    
    if (line.match(/^\s+def\s+__init__\s*\(/)) {
      inInit = true;
      const indentMatch = line.match(/^(\s+)/);
      initIndent = indentMatch ? indentMatch[1].length : 0;
      continue;
    }
    
    if (inInit) {
      // 检查是否离开了 __init__ 方法
      if (line.trim() && !line.match(/^\s/) || 
          (line.match(/^(\s+)/) && line.match(/^(\s+)/)![1].length <= initIndent && line.match(/^\s+def\s+/))) {
        inInit = false;
        continue;
      }
      
      // 匹配 self.xxx = 形式
      const propMatch = line.match(/self\.(\w+)\s*(?::\s*(\S+))?\s*=/);
      if (propMatch && !seenProperties.has(propMatch[1])) {
        seenProperties.add(propMatch[1]);
        properties.push({
          name: propMatch[1],
          type: propMatch[2] || undefined,
          isOptional: false,
          isReadonly: false,
        });
      }
    }
  }
  
  // 也查找类级别的属性定义
  for (let i = 0; i < classBody.length; i++) {
    const line = classBody[i];
    // 匹配类属性 xxx: Type = value 或 xxx = value
    const classPropMatch = line.match(/^\s{4}(\w+)\s*(?::\s*(\S+))?\s*=/);
    if (classPropMatch && !seenProperties.has(classPropMatch[1]) && !line.includes('def ')) {
      seenProperties.add(classPropMatch[1]);
      properties.push({
        name: classPropMatch[1],
        type: classPropMatch[2] || undefined,
        isOptional: false,
        isReadonly: false,
      });
    }
  }
  
  return properties;
}

/**
 * 解析 Python 函数参数
 */
function parsePythonParams(paramsStr: string): ParamInfo[] {
  if (!paramsStr.trim()) return [];
  
  const params: ParamInfo[] = [];
  const parts = paramsStr.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === 'self' || trimmed === 'cls') continue;
    
    // 匹配参数模式: name: type = default
    const paramMatch = trimmed.match(/^(\*{0,2}\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
    
    if (paramMatch) {
      params.push({
        name: paramMatch[1],
        type: paramMatch[2]?.trim(),
        isOptional: !!paramMatch[3],
        defaultValue: paramMatch[3]?.trim(),
      });
    }
  }
  
  return params;
}

/**
 * 提取 Python 代码块（基于缩进）
 */
function extractPythonBlock(lines: string[], startIndex: number): string[] {
  const result: string[] = [lines[startIndex]];
  
  // 获取起始行的缩进
  const startLine = lines[startIndex];
  const startIndentMatch = startLine.match(/^(\s*)/);
  const startIndent = startIndentMatch ? startIndentMatch[1].length : 0;
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    
    // 空行保留
    if (!line.trim()) {
      result.push(line);
      continue;
    }
    
    // 检查缩进
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    
    // 如果缩进小于等于起始缩进，说明代码块结束
    if (indent <= startIndent) {
      break;
    }
    
    result.push(line);
  }
  
  return result;
}

/**
 * 提取文档字符串
 */
function extractDocstring(block: string[]): string | null {
  // 查找块内的第一个文档字符串
  for (let i = 1; i < Math.min(block.length, 5); i++) {
    const line = block[i].trim();
    if (line.startsWith('"""') || line.startsWith("'''")) {
      const quote = line.slice(0, 3);
      
      // 单行文档字符串
      if (line.endsWith(quote) && line.length > 6) {
        return line.slice(3, -3).trim();
      }
      
      // 多行文档字符串
      let docstring = line.slice(3);
      for (let j = i + 1; j < block.length; j++) {
        const nextLine = block[j];
        if (nextLine.includes(quote)) {
          docstring += '\n' + nextLine.slice(0, nextLine.indexOf(quote));
          return docstring.trim();
        }
        docstring += '\n' + nextLine.trim();
      }
    }
  }
  
  return null;
}

