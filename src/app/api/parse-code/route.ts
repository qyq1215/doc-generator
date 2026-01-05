import { NextRequest, NextResponse } from 'next/server';
import { parseCode, generateCodeSummary } from '@/lib/code-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, fileName, language } = body;

    if (!code || !fileName) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: code 和 fileName' },
        { status: 400 }
      );
    }

    // 解析代码
    const metadata = parseCode(code, fileName, language);
    
    // 生成摘要
    const summary = generateCodeSummary(metadata);

    return NextResponse.json({
      success: true,
      data: {
        metadata,
        summary,
      },
    });
  } catch (error) {
    console.error('解析代码时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '解析代码时发生错误' 
      },
      { status: 500 }
    );
  }
}

