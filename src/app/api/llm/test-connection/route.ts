import { NextRequest, NextResponse } from 'next/server';
import { LLMConfig } from '@/lib/types';
import { createLLMAdapter } from '@/lib/llm/adapter';

export async function POST(request: NextRequest) {
  try {
    const config: LLMConfig = await request.json();

    if (!config.provider || !config.apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: provider 和 apiKey' },
        { status: 400 }
      );
    }

    // 创建适配器并测试连接
    const adapter = createLLMAdapter(config);
    const isConnected = await adapter.testConnection();

    if (isConnected) {
      return NextResponse.json({
        success: true,
        message: `${adapter.name} API 连接成功`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'API 连接失败，请检查密钥是否正确' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('测试连接时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '测试连接时发生错误' 
      },
      { status: 500 }
    );
  }
}

