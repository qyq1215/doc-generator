import { DocumentType, CodeMetadata } from '../types';

/**
 * 文档类型对应的系统提示词
 */
export const SYSTEM_PROMPTS: Record<DocumentType, string> = {
  requirements: `你是一个专业的软件需求分析师。你的任务是根据提供的代码或描述，生成清晰、完整的软件需求文档。

文档应包含：
1. 项目概述
2. 功能需求列表
3. 用户故事
4. 非功能需求（如有）
5. 业务规则

请使用 Markdown 格式，确保文档专业、易读。`,

  design: `你是一个资深的软件架构师。你的任务是根据提供的代码或描述，生成专业的软件设计文档。

文档应包含：
1. 系统概述
2. 架构设计
3. 模块设计
4. 类/组件设计
5. 数据流程
6. 接口设计

如果适用，请使用 Mermaid 语法添加架构图或流程图。请使用 Markdown 格式。`,

  api: `你是一个API文档专家。你的任务是根据提供的代码或描述，生成详细的API接口文档。

文档应包含：
1. API 概述
2. 接口列表
3. 每个接口的详细说明：
   - 接口路径
   - 请求方法
   - 请求参数
   - 响应格式
   - 示例代码
4. 错误码说明

请使用 Markdown 格式，必要时使用表格展示参数信息。`,

  test: `你是一个软件测试专家。你的任务是根据提供的代码或描述，生成完整的测试文档。

文档应包含：
1. 测试概述
2. 测试范围
3. 测试用例列表：
   - 用例ID
   - 测试场景
   - 前置条件
   - 测试步骤
   - 预期结果
4. 边界条件测试
5. 异常情况测试

请使用 Markdown 格式，使用表格展示测试用例。`,
};

/**
 * 生成用户提示词的模板
 */
export function generateUserPrompt(
  docType: DocumentType,
  inputType: 'code' | 'text',
  content: string,
  metadata?: CodeMetadata,
  additionalContext?: string
): string {
  const parts: string[] = [];

  // 添加任务描述
  parts.push(getTaskDescription(docType));
  parts.push('');

  // 添加输入内容
  if (inputType === 'code') {
    parts.push('## 代码内容');
    parts.push('```' + (metadata?.language || ''));
    parts.push(content);
    parts.push('```');
    parts.push('');

    // 添加代码分析摘要
    if (metadata) {
      parts.push('## 代码结构分析');
      parts.push(generateMetadataSummary(metadata));
      parts.push('');
    }
  } else {
    parts.push('## 需求描述');
    parts.push(content);
    parts.push('');
  }

  // 添加额外上下文
  if (additionalContext) {
    parts.push('## 补充说明');
    parts.push(additionalContext);
    parts.push('');
  }

  // 添加输出要求
  parts.push('## 输出要求');
  parts.push(getOutputRequirements(docType));

  return parts.join('\n');
}

/**
 * 获取任务描述
 */
function getTaskDescription(docType: DocumentType): string {
  const descriptions: Record<DocumentType, string> = {
    requirements: '请根据以下内容生成一份专业的**软件需求文档**。',
    design: '请根据以下内容生成一份专业的**软件设计文档**。',
    api: '请根据以下内容生成一份详细的**API接口文档**。',
    test: '请根据以下内容生成一份完整的**软件测试文档**。',
  };
  return descriptions[docType];
}

/**
 * 获取输出要求
 */
function getOutputRequirements(docType: DocumentType): string {
  const requirements: Record<DocumentType, string> = {
    requirements: `
1. 使用 Markdown 格式
2. 包含项目概述、功能需求、用户故事
3. 需求描述清晰、可测量
4. 为每个功能需求分配优先级（高/中/低）
5. 使用编号便于追踪`,

    design: `
1. 使用 Markdown 格式
2. 包含系统架构、模块设计、类设计
3. 使用 Mermaid 语法添加架构图或类图
4. 说明各模块之间的依赖关系
5. 包含设计决策和理由说明`,

    api: `
1. 使用 Markdown 格式
2. 每个接口包含完整的参数说明
3. 使用表格展示参数信息
4. 提供请求和响应的示例
5. 包含错误处理说明`,

    test: `
1. 使用 Markdown 格式
2. 测试用例使用表格形式
3. 包含正常流程和异常流程测试
4. 覆盖边界条件
5. 每个用例有明确的预期结果`,
  };
  return requirements[docType];
}

/**
 * 生成代码元数据摘要
 */
function generateMetadataSummary(metadata: CodeMetadata): string {
  const lines: string[] = [];

  lines.push(`- **文件名**: ${metadata.fileName}`);
  lines.push(`- **编程语言**: ${metadata.language}`);
  
  if (metadata.classes.length > 0) {
    lines.push(`- **类定义**: ${metadata.classes.length} 个`);
    metadata.classes.forEach(cls => {
      lines.push(`  - \`${cls.name}\`${cls.superClass ? ` (继承自 ${cls.superClass})` : ''}`);
      if (cls.methods.length > 0) {
        lines.push(`    - 方法: ${cls.methods.map(m => m.name).join(', ')}`);
      }
    });
  }

  if (metadata.functions.length > 0) {
    lines.push(`- **函数定义**: ${metadata.functions.length} 个`);
    metadata.functions.forEach(fn => {
      const params = fn.params.map(p => p.name).join(', ');
      lines.push(`  - \`${fn.name}(${params})\`${fn.returnType ? ` → ${fn.returnType}` : ''}`);
    });
  }

  if (metadata.interfaces.length > 0) {
    lines.push(`- **接口定义**: ${metadata.interfaces.length} 个`);
    metadata.interfaces.forEach(iface => {
      lines.push(`  - \`${iface.name}\``);
    });
  }

  if (metadata.imports.length > 0) {
    lines.push(`- **模块导入**: ${metadata.imports.length} 个`);
  }

  return lines.join('\n');
}

/**
 * 获取文档类型的中文名称
 */
export function getDocTypeName(docType: DocumentType): string {
  const names: Record<DocumentType, string> = {
    requirements: '需求文档',
    design: '设计文档',
    api: 'API文档',
    test: '测试文档',
  };
  return names[docType];
}

