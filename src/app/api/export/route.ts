import { NextRequest, NextResponse } from 'next/server';

/**
 * 导出文档 API
 * 支持 Markdown 和纯文本格式
 * PDF 和 DOCX 格式需要在客户端处理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, title, format = 'markdown' } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: '缺少文档内容' },
        { status: 400 }
      );
    }

    const fileName = `${title || '文档'}.${format === 'markdown' ? 'md' : 'txt'}`;
    
    // 根据格式处理内容
    let exportContent = content;
    
    if (format === 'text') {
      // 移除 Markdown 语法，转换为纯文本
      exportContent = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, (match: string) => {
          return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
        })
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/!\[.*?\]\(.+?\)/g, '[图片]');
    }

    // 返回文件内容
    return new NextResponse(exportContent, {
      headers: {
        'Content-Type': format === 'markdown' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('导出文档时出错:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '导出文档时发生错误' 
      },
      { status: 500 }
    );
  }
}

