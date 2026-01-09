import { BaseLLMAdapter } from './adapter';
import { LLMConfig, LLMResponse } from '../types';
import crypto from 'crypto';

/**
 * 讯飞星火认知大模型适配器
 * 文档: https://www.xfyun.cn/doc/spark/Web.html
 * 
 * API Key 格式: APPID:APIKey:APISecret
 * 例如: 12345678:abcdefgh:ijklmnop
 * 
 * 免费模型: spark-lite (无限免费)
 */
export class XfyunSparkAdapter extends BaseLLMAdapter {
  name = '讯飞星火';
  
  private appId: string = '';
  private apiKey: string = '';
  private apiSecret: string = '';

  constructor(config: LLMConfig) {
    super(config);
    this.parseConfig(config);
  }

  /**
   * 解析配置
   * 支持分离字段（appId, apiKey, apiSecret）或组合格式（apiKey: APPID:APIKey:APISecret）
   */
  private parseConfig(config: LLMConfig) {
    // 优先使用分离字段
    if (config.appId && config.apiKey && config.apiSecret) {
      this.appId = config.appId;
      this.apiKey = config.apiKey;
      this.apiSecret = config.apiSecret;
    } else if (config.apiKey && config.apiKey.includes(':')) {
      // 使用组合格式（向后兼容）
      const parts = config.apiKey.split(':');
      if (parts.length !== 3) {
        throw new Error('讯飞星火 API Key 格式错误，正确格式: APPID:APIKey:APISecret');
      }
      this.appId = parts[0];
      this.apiKey = parts[1];
      this.apiSecret = parts[2];
    } else {
      throw new Error('讯飞星火需要 APPID、APIKey 和 APISecret，请提供分离字段或使用格式 "APPID:APIKey:APISecret"');
    }
  }

  /**
   * 获取模型域名
   */
  private getDomain(): string {
    const model = this.config.model || 'spark-lite';
    const domainMap: Record<string, string> = {
      'spark-lite': 'lite',      // 免费版
      'spark-pro': 'generalv3',  // Pro版
      'spark-max': 'generalv3.5', // Max版
      'spark-ultra': 'max-32k',  // Ultra版
    };
    return domainMap[model] || 'lite';
  }

  /**
   * 获取 WebSocket URL
   */
  private getWsUrl(): string {
    const model = this.config.model || 'spark-lite';
    const urlMap: Record<string, string> = {
      'spark-lite': 'wss://spark-api.xf-yun.com/v1.1/chat',
      'spark-pro': 'wss://spark-api.xf-yun.com/v3.1/chat',
      'spark-max': 'wss://spark-api.xf-yun.com/v3.5/chat',
      'spark-ultra': 'wss://spark-api.xf-yun.com/v4.0/chat',
    };
    return urlMap[model] || urlMap['spark-lite'];
  }

  /**
   * 生成鉴权 URL
   */
  private createAuthUrl(): string {
    const host = 'spark-api.xf-yun.com';
    const path = this.getWsUrl().replace('wss://spark-api.xf-yun.com', '');
    const date = new Date().toUTCString();
    
    // 构建签名原文
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    
    // HMAC-SHA256 签名
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(signatureOrigin)
      .digest('base64');
    
    // 构建 authorization
    const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = Buffer.from(authorizationOrigin).toString('base64');
    
    // 构建最终 URL
    const url = `${this.getWsUrl()}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
    
    return url;
  }

  /**
   * 构建请求消息
   */
  private buildMessage(prompt: string, systemPrompt?: string) {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });
    
    return {
      header: {
        app_id: this.appId,
        uid: 'doc-generator',
      },
      parameter: {
        chat: {
          domain: this.getDomain(),
          temperature: 0.7,
          max_tokens: 4096,
        },
      },
      payload: {
        message: {
          text: messages,
        },
      },
    };
  }

  /**
   * 使用 HTTP API 作为备选（通过代理转发）
   * 讯飞主要使用 WebSocket，这里提供一个简化的 HTTP 实现
   */
  async generateDoc(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    // 由于 Next.js 服务端不便直接使用 WebSocket
    // 我们使用流式方法收集完整响应
    let fullContent = '';
    
    await this.generateDocStream(prompt, systemPrompt, (chunk) => {
      fullContent += chunk;
    });

    return { content: fullContent };
  }

  /**
   * 流式生成（使用 WebSocket）
   * 在 Node.js 环境中使用
   */
  async generateDocStream(
    prompt: string,
    systemPrompt?: string,
    onChunk?: (chunk: string) => void
  ): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      // 动态导入 ws 模块（仅在服务端）
      import('ws').then(({ default: WebSocket }) => {
        const url = this.createAuthUrl();
        const ws = new WebSocket(url);
        
        let fullContent = '';
        let usage: LLMResponse['usage'] = undefined;
        
        ws.on('open', () => {
          const message = this.buildMessage(prompt, systemPrompt);
          ws.send(JSON.stringify(message));
        });
        
        ws.on('message', (data: Buffer) => {
          try {
            const response = JSON.parse(data.toString());
            
            // 检查错误
            if (response.header.code !== 0) {
              ws.close();
              reject(new Error(`讯飞API错误: ${response.header.code} - ${response.header.message}`));
              return;
            }
            
            // 提取内容
            const text = response.payload?.choices?.text;
            if (text && text.length > 0) {
              const content = text[0].content || '';
              fullContent += content;
              onChunk?.(content);
            }
            
            // 获取 usage
            if (response.payload?.usage?.text) {
              const u = response.payload.usage.text;
              usage = {
                promptTokens: u.prompt_tokens || 0,
                completionTokens: u.completion_tokens || 0,
                totalTokens: u.total_tokens || 0,
              };
            }
            
            // 检查是否结束
            if (response.header.status === 2) {
              ws.close();
              resolve({ content: fullContent, usage });
            }
          } catch (error) {
            console.error('解析讯飞响应失败:', error);
          }
        });
        
        ws.on('error', (error) => {
          reject(new Error(`讯飞WebSocket错误: ${error.message}`));
        });
        
        ws.on('close', () => {
          if (!fullContent) {
            reject(new Error('连接关闭但未收到响应'));
          }
        });
        
        // 设置超时
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
            reject(new Error('请求超时'));
          }
        }, 60000);
        
      }).catch((error) => {
        reject(new Error(`无法加载WebSocket模块: ${error.message}`));
      });
    });
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.generateDoc('你好，请回复"连接成功"');
      return response.content.length > 0;
    } catch (error) {
      console.error('讯飞连接测试失败:', error);
      return false;
    }
  }
}

