import { LLMConfig, LLMResponse } from '../types';

/**
 * LLM 提供商适配器接口
 */
export interface LLMProvider {
  name: string;
  generateDoc(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
  generateDocStream(
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse>;
  testConnection(): Promise<boolean>;
}

/**
 * LLM 适配器基类
 */
export abstract class BaseLLMAdapter implements LLMProvider {
  protected config: LLMConfig;
  abstract name: string;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract generateDoc(prompt: string, systemPrompt?: string): Promise<LLMResponse>;
  abstract generateDocStream(
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse>;

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateDoc('你好，请回复"连接成功"');
      return response.content.includes('成功') || response.content.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * 创建 LLM 适配器
 */
export function createLLMAdapter(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'zhipu':
      // 动态导入避免循环依赖
      const { ZhipuGLMAdapter } = require('./zhipu-glm');
      return new ZhipuGLMAdapter(config);
    case 'ernie':
      const { ErnieAdapter } = require('./ernie');
      return new ErnieAdapter(config);
    case 'xfyun':
      const { XfyunSparkAdapter } = require('./xfyun-spark');
      return new XfyunSparkAdapter(config);
    default:
      throw new Error(`不支持的 LLM 提供商: ${config.provider}`);
  }
}

/**
 * 默认系统提示词
 */
export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的软件工程文档生成助手。你的任务是根据用户提供的代码或需求描述，生成高质量、专业的软件工程文档。

请遵循以下原则：
1. 文档应该清晰、准确、完整
2. 使用专业的技术术语
3. 保持格式规范和一致
4. 适当使用 Markdown 格式增强可读性
5. 如有必要，添加示例代码或图表说明

请根据用户的具体需求生成相应类型的文档。`;

