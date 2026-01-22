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
import { Download, FileText, FileJson, Loader2, Copy, Check, File } from 'lucide-react';
import { toast } from 'sonner';
import { saveAs } from 'file-saver';

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

  // 导出为 Word
  const exportWord = async () => {
    setIsExporting(true);
    try {
      // 动态导入docx库
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
      
      // 简单的Markdown解析，转换为docx格式
      const paragraphs: InstanceType<typeof Paragraph>[] = [];
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          paragraphs.push(new Paragraph({ text: '' }));
          continue;
        }
        
        // 标题
        if (trimmedLine.startsWith('# ')) {
          paragraphs.push(new Paragraph({
            text: trimmedLine.substring(2),
            heading: HeadingLevel.HEADING_1,
          }));
        } else if (trimmedLine.startsWith('## ')) {
          paragraphs.push(new Paragraph({
            text: trimmedLine.substring(3),
            heading: HeadingLevel.HEADING_2,
          }));
        } else if (trimmedLine.startsWith('### ')) {
          paragraphs.push(new Paragraph({
            text: trimmedLine.substring(4),
            heading: HeadingLevel.HEADING_3,
          }));
        } else if (trimmedLine.startsWith('#### ')) {
          paragraphs.push(new Paragraph({
            text: trimmedLine.substring(5),
            heading: HeadingLevel.HEADING_3,
          }));
        }
        // 代码块
        else if (trimmedLine.startsWith('```')) {
          const codeLines: string[] = [];
          i++; // 跳过开始标记
          while (i < lines.length && !lines[i].trim().startsWith('```')) {
            codeLines.push(lines[i]);
            i++;
          }
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: codeLines.join('\n'), font: 'Courier New' })],
          }));
        }
        // 普通段落
        else {
          // 处理内联格式
          const textRuns: InstanceType<typeof TextRun>[] = [];
          let remainingText = trimmedLine;
          
          // 处理粗体 **text**
          const boldMatches = [...remainingText.matchAll(/\*\*(.+?)\*\*/g)];
          let lastIndex = 0;
          
          for (const match of boldMatches) {
            if (match.index !== undefined) {
              if (match.index > lastIndex) {
                textRuns.push(new TextRun({ text: remainingText.substring(lastIndex, match.index) }));
              }
              textRuns.push(new TextRun({ text: match[1], bold: true }));
              lastIndex = match.index + match[0].length;
            }
          }
          if (lastIndex < remainingText.length) {
            textRuns.push(new TextRun({ text: remainingText.substring(lastIndex) }));
          }
          
          paragraphs.push(new Paragraph({
            children: textRuns.length > 0 ? textRuns : [new TextRun({ text: trimmedLine })],
          }));
        }
      }
      
      const doc = new Document({
        sections: [{
          children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: content })],
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `${title}.docx`);
      toast.success('Word 文件已下载');
    } catch (error) {
      toast.error('导出失败');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  // 导出为 PDF
  const exportPDF = async () => {
    setIsExporting(true);
    try {
      // 动态导入，避免服务端执行
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      
      // 创建一个临时容器来渲染Markdown内容
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.color = '#334155';
      
      // 简单的Markdown转HTML
      let html = content
        .replace(/^### (.*$)/gm, '<h3 style="color: #0891b2; margin-top: 1.5em;">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color: #0891b2; margin-top: 1.5em;">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 style="color: #0891b2; border-bottom: 2px solid #99f6e4; padding-bottom: 0.3em; margin-top: 1.5em;">$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`(.+?)`/g, '<code style="background: #ecfeff; color: #0e7490; padding: 0.2em 0.4em; border-radius: 3px;">$1</code>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background: #f1f5f9; padding: 1em; border-radius: 8px; overflow-x: auto; border: 1px solid #e2e8f0;"><code>$2</code></pre>')
        .replace(/\n/g, '<br>');
      
      tempDiv.innerHTML = html;
      document.body.appendChild(tempDiv);
      
      // 转换为canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      document.body.removeChild(tempDiv);
      
      // 创建PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${title}.pdf`);
      toast.success('PDF 文件已下载');
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
        <DropdownMenuItem 
          onClick={exportWord}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          <File className="h-4 w-4 mr-2" />
          导出为 Word (.docx)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={exportPDF}
          className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800 cursor-pointer"
        >
          <FileText className="h-4 w-4 mr-2" />
          导出为 PDF (.pdf)
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
