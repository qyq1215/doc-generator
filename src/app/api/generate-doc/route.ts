import { NextRequest } from 'next/server';
import { GenerateRequest, LLMConfig } from '@/lib/types';
import { DocGenerator, createMockGenerator } from '@/lib/doc-generator';
import { cookies } from 'next/headers';

/**
 * 从 cookies 获取 LLM 配置
 */
async function getLLMConfig(): Promise<LLMConfig | null> {
  const cookieStore = await cookies();
  const configCookie = cookieStore.get('llm-config');
  
  if (!configCookie) {
    return null;
  }
  
  try {
    return JSON.parse(configCookie.value);
  } catch {
    return null;
  }
}

/**
 * 生成文档 API
 * 支持流式和非流式两种模式
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, docType, content, fileName, language, additionalContext, stream = false, useMock = false } = body;

    // 验证必要参数
    if (!type || !docType || !content) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必要参数' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const generateRequest: GenerateRequest = {
      type,
      docType,
      content,
      fileName,
      language,
      additionalContext,
    };

    // 使用模拟生成器（演示模式）
    if (useMock) {
      const mockGenerator = createMockGenerator();
      
      if (stream) {
        return createStreamResponse(async (writer) => {
          await mockGenerator.generateStream(generateRequest, (chunk) => {
            writer.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          });
          writer.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        });
      } else {
        const result = await mockGenerator.generate(generateRequest);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 获取 LLM 配置
    const llmConfig = await getLLMConfig();
    if (!llmConfig) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '请先配置 LLM API 密钥',
          needConfig: true 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建文档生成器
    const generator = new DocGenerator({ llmConfig });

    // 流式生成
    if (stream) {
      return createStreamResponse(async (writer) => {
        try {
          const result = await generator.generateStream(generateRequest, (chunk) => {
            writer.write(`data: ${JSON.stringify({ chunk })}\n\n`);
          });
          writer.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '生成失败';
          writer.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        }
      });
    }

    // 非流式生成
    const result = await generator.generate(generateRequest);
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('生成文档时出错:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : '生成文档时发生错误' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 创建 SSE 流式响应
 */
function createStreamResponse(
  handler: (writer: { write: (data: string) => void }) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const writer = {
        write: (data: string) => {
          controller.enqueue(encoder.encode(data));
        },
      };
      
      try {
        await handler(writer);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

