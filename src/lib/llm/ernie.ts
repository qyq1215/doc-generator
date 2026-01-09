import { BaseLLMAdapter } from './adapter';
import { LLMConfig, LLMResponse } from '../types';

/**
 * 文心一言 (ERNIE Bot) 适配器 - 使用千帆API v2
 * 文档: https://cloud.baidu.com/doc/qianfan-api/s/ym9chdsy5
 * 
 * 千帆API只需要一个API Key，使用Bearer token方式
 */
export class ErnieAdapter extends BaseLLMAdapter {
  name = '文心一言';
  private baseUrl = 'https://qianfan.baidubce.com/v2/chat/completions';

  constructor(config: LLMConfig) {
    super(config);
    
    if (!config.apiKey) {
      throw new Error('文心一言需要 API Key');
    }
  }

  /**
   * 获取模型名称（千帆API使用模型名称，而不是端点）
   */
  private getModelName(): string {
    const model = this.config.model || 'ernie-3.5-8k';
    
    // 千帆API的模型名称映射
    const modelMap: Record<string, string> = {
      'ernie-4.0-8k': 'ernie-4.0-8k',
      'ernie-4.0-turbo-8k': 'ernie-4.0-turbo-8k',
      'ernie-3.5-8k': 'ernie-3.5-8k',
      'ernie-speed-8k': 'ernie-speed-8k',
      'ernie-lite-8k': 'ernie-lite-8k',
    };

    return modelMap[model] || 'ernie-3.5-8k';
  }

  /**
   * 生成文档（非流式）
   */
  async generateDoc(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const model = this.getModelName();
    
    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`文心一言API调用失败: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // 千帆API的错误格式
    if (data.error) {
      throw new Error(`文心一言API错误: ${data.error.code || 'unknown'} - ${data.error.message || '未知错误'}`);
    }

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
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
    const model = this.getModelName();
    
    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        top_p: 0.9,
        stream: true,
      }),
    });

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
            
            // 流式响应结束标记
            if (data === '[DONE]') {
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              // 千帆API的错误格式
              if (parsed.error) {
                throw new Error(`文心一言API错误: ${parsed.error.code || 'unknown'} - ${parsed.error.message || '未知错误'}`);
              }
              
              // 提取内容
              const content = parsed.choices?.[0]?.delta?.content || '';
              
              if (content) {
                fullContent += content;
                onChunk?.(content);
              }

              // 提取usage信息（通常在最后一个chunk中）
              if (parsed.usage) {
                usage = {
                  promptTokens: parsed.usage.prompt_tokens || 0,
                  completionTokens: parsed.usage.completion_tokens || 0,
                  totalTokens: parsed.usage.total_tokens || 0,
                };
              }
            } catch (e) {
              if (e instanceof Error && e.message.includes('文心一言API错误')) {
                throw e;
              }
              // 忽略其他解析错误（可能是流式数据的中间片段）
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

