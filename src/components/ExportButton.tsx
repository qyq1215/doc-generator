'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileJson, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ExportButtonProps {
  content: string;
  title?: string;
  disabled?: boolean;
}

export function ExportButton({ content, title = '文档', disabled = false }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // 下载文件
  const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导出为 Markdown
  const exportMarkdown = async () => {
    setIsExporting(true);
    try {
      const fileName = `${title}.md`;
      downloadFile(content, fileName, 'text/markdown;charset=utf-8');
      toast.success('Markdown 文件已下载');
    } catch (error) {
      toast.error('导出失败');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // 导出为纯文本
  const exportText = async () => {
    setIsExporting(true);
    try {
      // 移除 Markdown 语法
      const plainText = content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/```[\s\S]*?```/g, (match) => {
          return match.replace(/```\w*\n?/g, '').replace(/```/g, '');
        })
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .replace(/!\[.*?\]\(.+?\)/g, '[图片]')
        .replace(/\|[\s\S]*?\|/g, (match) => {
          // 简单处理表格
          return match.replace(/\|/g, '\t').replace(/-+/g, '');
        });

      const fileName = `${title}.txt`;
      downloadFile(plainText, fileName, 'text/plain;charset=utf-8');
      toast.success('文本文件已下载');
    } catch (error) {
      toast.error('导出失败');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // 导出为 HTML
  const exportHTML = async () => {
    setIsExporting(true);
    try {
      // 简单的 Markdown 转 HTML
      let html = content
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        .replace(/\n/g, '<br>');

      const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #334155;
      background: linear-gradient(135deg, #ecfeff 0%, #f0fdfa 100%);
    }
    h1, h2, h3 { color: #0891b2; margin-top: 1.5em; }
    h1 { border-bottom: 2px solid #99f6e4; padding-bottom: 0.3em; }
    code {
      background: #ecfeff;
      color: #0e7490;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: #f1f5f9;
      padding: 1em;
      border-radius: 8px;
      overflow-x: auto;
      border: 1px solid #e2e8f0;
    }
    pre code {
      background: none;
      padding: 0;
      color: #475569;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    th { background: #ecfeff; color: #0891b2; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

      const fileName = `${title}.html`;
      downloadFile(fullHTML, fileName, 'text/html;charset=utf-8');
      toast.success('HTML 文件已下载');
    } catch (error) {
      toast.error('导出失败');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('复制失败');
      console.error(error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !content || isExporting}
          className="border-cyan-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          导出
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white border-slate-200">
        <DropdownMenuItem 
          onClick={exportMarkdown}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          导出为 Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={exportText}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          导出为纯文本 (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={exportHTML}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          <FileJson className="h-4 w-4 mr-2" />
          导出为 HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-slate-200" />
        <DropdownMenuItem 
          onClick={copyToClipboard}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-emerald-500" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          复制到剪贴板
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
