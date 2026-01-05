import { BaseLLMAdapter } from './adapter';
import { LLMConfig, LLMResponse } from '../types';

/**
 * 文心一言 (ERNIE Bot) 适配器
 * 文档: https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html
 */
export class ErnieAdapter extends BaseLLMAdapter {
  name = '文心一言';
  private baseUrl = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: LLMConfig) {
    super(config);
  }

  /**
   * 获取访问令牌
   * 注意：文心一言需要 API Key 和 Secret Key 来获取 access_token
   * 这里假设 config.apiKey 格式为 "apiKey:secretKey"
   */
  private async getAccessToken(): Promise<string> {
    // 如果 token 还有效，直接返回
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // 解析 API Key 和 Secret Key
    const [apiKey, secretKey] = this.config.apiKey.split(':');
    if (!apiKey || !secretKey) {
      throw new Error('文心一言需要 API Key 和 Secret Key，格式为 "apiKey:secretKey"');
    }

    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      throw new Error('获取文心一言访问令牌失败');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // 设置过期时间（提前 5 分钟刷新）
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken!;
  }

  /**
   * 获取模型端点
   */
  private getModelEndpoint(): string {
    const model = this.config.model || 'ernie-4.0-8k';
    
    const modelEndpoints: Record<string, string> = {
      'ernie-4.0-8k': 'completions_pro',
      'ernie-4.0-turbo-8k': 'ernie-4.0-turbo-8k',
      'ernie-3.5-8k': 'completions',
      'ernie-speed-8k': 'ernie_speed',
      'ernie-lite-8k': 'ernie-lite-8k',
    };

    return modelEndpoints[model] || 'completions_pro';
  }

  /**
   * 生成文档（非流式）
   */
  async generateDoc(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const accessToken = await this.getAccessToken();
    const endpoint = this.getModelEndpoint();

    const response = await fetch(
      `${this.baseUrl}/${endpoint}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: systemPrompt,
          temperature: 0.7,
          top_p: 0.9,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`文心一言API调用失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (data.error_code) {
      throw new Error(`文心一言API错误: ${data.error_code} - ${data.error_msg}`);
    }

    return {
      content: data.result || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  /**
   * 生成文档（流式）
   */
  async generateDocStream(
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse> {
    const accessToken = await this.getAccessToken();
    const endpoint = this.getModelEndpoint();

    const response = await fetch(
      `${this.baseUrl}/${endpoint}?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          system: systemPrompt,
          temperature: 0.7,
          top_p: 0.9,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`文心一言API调用失败: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let usage: LLMResponse['usage'] = undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error_code) {
                throw new Error(`文心一言API错误: ${parsed.error_code} - ${parsed.error_msg}`);
              }
              
              const content = parsed.result || '';
              
              if (content) {
                fullContent += content;
                onChunk?.(content);
              }

              if (parsed.is_end && parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
                };
              }
            } catch (e) {
              if (e instanceof Error && e.message.includes('文心一言API错误')) {
                throw e;
              }
              // 忽略其他解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { content: fullContent, usage };
  }
}

