import { DocumentType, CodeMetadata, GenerateRequest } from '../types';
import { SYSTEM_PROMPTS, generateUserPrompt } from './templates';
import { parseCode, generateCodeSummary } from '../code-parser';

/**
 * Prompt 构建器配置
 */
export interface PromptBuilderConfig {
  includeCodeSummary?: boolean;
  maxCodeLength?: number;
  language?: string;
}

/**
 * 构建的 Prompt 结果
 */
export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  metadata?: CodeMetadata;
}

/**
 * Prompt 构建器类
 */
export class PromptBuilder {
  private config: PromptBuilderConfig;

  constructor(config: PromptBuilderConfig = {}) {
    this.config = {
      includeCodeSummary: true,
      maxCodeLength: 50000, // 约 50KB
      ...config,
    };
  }

  /**
   * 从生成请求构建 Prompt
   */
  buildFromRequest(request: GenerateRequest): BuiltPrompt {
    const { type, docType, content, fileName, additionalContext } = request;

    // 获取系统提示词
    const systemPrompt = SYSTEM_PROMPTS[docType];

    // 解析代码（如果是代码输入）
    let metadata: CodeMetadata | undefined;
    if (type === 'code' && fileName) {
      // 截断过长的代码
      const truncatedCode = this.truncateCode(content);
      metadata = parseCode(truncatedCode, fileName, request.language);
    }

    // 生成用户提示词
    const userPrompt = generateUserPrompt(
      docType,
      type,
      type === 'code' ? this.truncateCode(content) : content,
      metadata,
      additionalContext
    );

    return {
      systemPrompt,
      userPrompt,
      metadata,
    };
  }

  /**
   * 直接从代码构建 Prompt
   */
  buildFromCode(
    code: string,
    fileName: string,
    docType: DocumentType,
    additionalContext?: string
  ): BuiltPrompt {
    return this.buildFromRequest({
      type: 'code',
      docType,
      content: code,
      fileName,
      additionalContext,
    });
  }

  /**
   * 直接从文本描述构建 Prompt
   */
  buildFromText(
    text: string,
    docType: DocumentType,
    additionalContext?: string
  ): BuiltPrompt {
    return this.buildFromRequest({
      type: 'text',
      docType,
      content: text,
      additionalContext,
    });
  }

  /**
   * 截断过长的代码
   */
  private truncateCode(code: string): string {
    if (code.length <= this.config.maxCodeLength!) {
      return code;
    }

    const truncated = code.slice(0, this.config.maxCodeLength!);
    const lastNewline = truncated.lastIndexOf('\n');
    
    return (lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated) +
      '\n\n// ... 代码过长，已截断 ...';
  }

  /**
   * 获取代码摘要（用于预览）
   */
  getCodeSummary(code: string, fileName: string): string {
    const metadata = parseCode(code, fileName, this.config.language);
    return generateCodeSummary(metadata);
  }
}

/**
 * 默认的 Prompt 构建器实例
 */
export const defaultPromptBuilder = new PromptBuilder();

