import { CodeMetadata } from '../types';
import { parseJavaScript } from './js-parser';
import { parsePython } from './python-parser';

// 支持的语言列表
export const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// 文件扩展名到语言的映射
const EXTENSION_MAP: Record<string, SupportedLanguage> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
};

/**
 * 根据文件名获取编程语言
 */
export function getLanguageFromFileName(fileName: string): SupportedLanguage | null {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return EXTENSION_MAP[ext] || null;
}

/**
 * 检查语言是否支持
 */
export function isLanguageSupported(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

/**
 * 解析代码文件
 * @param code 代码内容
 * @param fileName 文件名
 * @param language 可选的语言参数，如果不提供则从文件名推断
 */
export function parseCode(
  code: string,
  fileName: string,
  language?: string
): CodeMetadata {
  // 确定语言
  const detectedLanguage = language || getLanguageFromFileName(fileName);
  
  if (!detectedLanguage || !isLanguageSupported(detectedLanguage)) {
    // 返回基本元数据，不进行深度解析
    return {
      fileName,
      language: detectedLanguage || 'unknown',
      classes: [],
      functions: [],
      interfaces: [],
      imports: [],
      exports: [],
      comments: [],
      rawCode: code,
    };
  }

  // 根据语言选择解析器
  switch (detectedLanguage) {
    case 'javascript':
    case 'typescript':
      return parseJavaScript(code, fileName, detectedLanguage);
    case 'python':
      return parsePython(code, fileName);
    default:
      return {
        fileName,
        language: detectedLanguage,
        classes: [],
        functions: [],
        interfaces: [],
        imports: [],
        exports: [],
        comments: [],
        rawCode: code,
      };
  }
}

/**
 * 将代码元数据转换为可读的摘要
 */
export function generateCodeSummary(metadata: CodeMetadata): string {
  const lines: string[] = [];
  
  lines.push(`## 代码分析摘要`);
  lines.push(`**文件**: ${metadata.fileName}`);
  lines.push(`**语言**: ${metadata.language}`);
  lines.push('');
  
  // 类信息
  if (metadata.classes.length > 0) {
    lines.push(`### 类 (${metadata.classes.length}个)`);
    metadata.classes.forEach(cls => {
      lines.push(`- **${cls.name}**${cls.superClass ? ` extends ${cls.superClass}` : ''}`);
      if (cls.properties.length > 0) {
        lines.push(`  - 属性: ${cls.properties.map(p => p.name).join(', ')}`);
      }
      if (cls.methods.length > 0) {
        lines.push(`  - 方法: ${cls.methods.map(m => m.name).join(', ')}`);
      }
    });
    lines.push('');
  }
  
  // 函数信息
  if (metadata.functions.length > 0) {
    lines.push(`### 函数 (${metadata.functions.length}个)`);
    metadata.functions.forEach(fn => {
      const params = fn.params.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ');
      lines.push(`- **${fn.name}**(${params})${fn.returnType ? ` → ${fn.returnType}` : ''}`);
      if (fn.comments && fn.comments.length > 0) {
        lines.push(`  - ${fn.comments[0]}`);
      }
    });
    lines.push('');
  }
  
  // 接口信息
  if (metadata.interfaces.length > 0) {
    lines.push(`### 接口 (${metadata.interfaces.length}个)`);
    metadata.interfaces.forEach(iface => {
      lines.push(`- **${iface.name}**`);
      if (iface.properties.length > 0) {
        lines.push(`  - 属性: ${iface.properties.map(p => p.name).join(', ')}`);
      }
    });
    lines.push('');
  }
  
  // 导入信息
  if (metadata.imports.length > 0) {
    lines.push(`### 导入 (${metadata.imports.length}个)`);
    metadata.imports.forEach(imp => {
      lines.push(`- from "${imp.source}": ${imp.specifiers.join(', ')}`);
    });
    lines.push('');
  }
  
  return lines.join('\n');
}

