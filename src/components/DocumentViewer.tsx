'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Code } from 'lucide-react';
import { ExportButton } from './ExportButton';

// 动态导入 mermaid，避免SSR问题
let mermaidInstance: typeof import('mermaid').default | null = null;
let mermaidInitialized = false;

const initMermaid = async () => {
  if (typeof window === 'undefined') return null;
  if (mermaidInstance && mermaidInitialized) return mermaidInstance;
  
  try {
    const mermaid = (await import('mermaid')).default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      fontFamily: 'inherit',
      suppressErrorRendering: true, // 抑制错误渲染到页面
    });
    mermaidInstance = mermaid;
    mermaidInitialized = true;
    return mermaid;
  } catch {
    return null;
  }
};

interface DocumentViewerProps {
  content: string;
  title?: string;
  isLoading?: boolean;
  minHeight?: string; // 最小高度，如 "480px"
}

// 检查 mermaid 代码是否看起来完整
function isMermaidComplete(chart: string): boolean {
  const trimmed = chart.trim();
  if (!trimmed) return false;
  
  // 检查是否有基本的图表类型声明
  const hasGraphType = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|gitGraph)/m.test(trimmed);
  if (!hasGraphType) return false;
  
  // 检查 subgraph 是否都有对应的 end
  const subgraphCount = (trimmed.match(/subgraph\s+/g) || []).length;
  const endCount = (trimmed.match(/\bend\b/g) || []).length;
  if (subgraphCount > endCount) return false;
  
  // 检查是否有至少一个节点或连接
  const hasContent = /-->|---|->|==>|\[.*\]|\(.*\)/.test(trimmed);
  
  return hasContent;
}

// Mermaid 图表组件
function MermaidChart({ chart, isLoading }: { chart: string; isLoading?: boolean }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const renderIdRef = useRef(0);
  const lastValidSvgRef = useRef<string>('');

  // 检查代码是否完整
  const isComplete = useMemo(() => isMermaidComplete(chart), [chart]);

  useEffect(() => {
    // 如果正在加载且代码不完整，不尝试渲染
    if (isLoading && !isComplete) {
      return;
    }

    // 如果代码不完整，显示上一次成功渲染的结果或占位符
    if (!isComplete) {
      if (lastValidSvgRef.current) {
        setSvg(lastValidSvgRef.current);
      }
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    
    const renderChart = async () => {
      setIsRendering(true);
      setError(null);
      
      try {
        const mermaid = await initMermaid();
        if (!mermaid) {
          setError('Mermaid 加载失败');
          return;
        }

        // 检查是否已经被新的渲染请求取代
        if (currentRenderId !== renderIdRef.current) return;

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        
        // 再次检查是否已经被新的渲染请求取代
        if (currentRenderId !== renderIdRef.current) return;

        setSvg(renderedSvg);
        lastValidSvgRef.current = renderedSvg;
        setError(null);
      } catch (err) {
        // 只在最新的渲染请求时设置错误
        if (currentRenderId === renderIdRef.current) {
          console.warn('Mermaid render warning:', err);
          // 如果有上一次成功的渲染结果，继续显示它
          if (lastValidSvgRef.current) {
            setSvg(lastValidSvgRef.current);
          } else {
            setError('图表语法有误，请检查');
          }
        }
      } finally {
        if (currentRenderId === renderIdRef.current) {
          setIsRendering(false);
        }
      }
    };

    // 添加延迟，避免频繁渲染
    const timeoutId = setTimeout(renderChart, 300);
    return () => clearTimeout(timeoutId);
  }, [chart, isComplete, isLoading]);

  // 正在加载且没有内容时显示占位符
  if (isLoading && !svg && !error) {
    return (
      <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="flex items-center justify-center h-32 text-slate-400">
          <span>架构图渲染中...</span>
        </div>
      </div>
    );
  }

  // 显示错误（仅在没有有效SVG时）
  if (error && !svg) {
    return (
      <div className="my-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
        {error}
      </div>
    );
  }

  // 显示SVG
  if (svg) {
    return (
      <div 
        className={`my-4 p-4 bg-white border border-slate-200 rounded-lg overflow-auto ${isRendering ? 'opacity-70' : ''}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // 默认占位符
  return (
    <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
      <div className="flex items-center justify-center h-32 text-slate-400">
        <span>图表加载中...</span>
      </div>
    </div>
  );
}

// 预处理 markdown 内容，修复错误的表格格式
function preprocessMarkdown(text: string): string {
  if (!text) return text;
  
  // 修复写在一行的表格格式：| a | b | | --- | --- | | c | d |
  // 将其转换为多行格式
  return text.replace(
    /(\|[^|]+\|(?:[^|]+\|)+)\s*(\|\s*[-:]+\s*\|(?:\s*[-:]+\s*\|)+)\s*(\|[^|]+\|(?:[^|]+\|)*)/g,
    (match, header, separator, body) => {
      // 检查是否已经是多行格式
      if (match.includes('\n')) return match;
      
      // 将表格分割成多行
      const headerRow = header.trim();
      const separatorRow = separator.trim();
      
      // 处理表格体，可能有多行数据
      const bodyContent = body.trim();
      const bodyRows: string[] = [];
      let currentRow = '';
      let pipeCount = 0;
      const headerPipeCount = (headerRow.match(/\|/g) || []).length;
      
      for (let i = 0; i < bodyContent.length; i++) {
        const char = bodyContent[i];
        currentRow += char;
        if (char === '|') {
          pipeCount++;
          if (pipeCount === headerPipeCount) {
            bodyRows.push(currentRow.trim());
            currentRow = '';
            pipeCount = 0;
          }
        }
      }
      if (currentRow.trim()) {
        bodyRows.push(currentRow.trim());
      }
      
      return headerRow + '\n' + separatorRow + '\n' + bodyRows.join('\n');
    }
  );
}

export function DocumentViewer({ 
  content, 
  title, 
  isLoading = false,
  minHeight = '480px',
}: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState('preview');
  const contentRef = useRef<HTMLDivElement>(null);
  
  // 预处理内容
  const processedContent = useMemo(() => preprocessMarkdown(content), [content]);

  // 自动滚动到底部（流式输出时），但频率限制
  useEffect(() => {
    if (isLoading && contentRef.current) {
      // 使用 requestAnimationFrame 限制滚动频率
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      });
    }
  }, [content, isLoading]);

  // 判断是否为空状态
  const isEmpty = !content && !isLoading;

  return (
    <Card 
      className="bg-white/80 backdrop-blur border-cyan-100 overflow-hidden flex flex-col"
      style={{ minHeight }}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-100 bg-cyan-50/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-cyan-600" />
          <span className="text-slate-700 font-medium">{title || '生成的文档'}</span>
        </div>
        
        <ExportButton 
          content={content} 
          title={title || '文档'} 
          disabled={!content}
        />
      </div>

      {/* 内容区域 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col w-full">
        <div className="px-4 py-3 border-b border-cyan-100">
          <TabsList className="bg-slate-100/80 p-1 rounded-lg">
            <TabsTrigger 
              value="preview" 
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              预览
            </TabsTrigger>
            <TabsTrigger 
              value="source"
              className="rounded-md px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-cyan-700 data-[state=active]:shadow-sm text-slate-500 hover:text-slate-700"
            >
              <Code className="h-4 w-4 mr-1.5" />
              源码
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="mt-0 flex-1">
          <div ref={contentRef} className="p-6 h-[640px] overflow-auto scroll-smooth">
            {isEmpty ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>文档内容将在这里显示</p>
              </div>
            ) : isLoading && !content ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
              </div>
            ) : (
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-slate-800 mt-6 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-medium text-slate-700 mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-slate-600 mb-3 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-slate-600 mb-3 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-slate-600 mb-3 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-slate-600">{children}</li>
                    ),
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');
                      
                      // 检测是否为 mermaid 图表
                      if (language === 'mermaid') {
                        return <MermaidChart chart={codeString} isLoading={isLoading} />;
                      }
                      
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 text-sm font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block p-4 rounded-lg bg-slate-50 text-slate-700 text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-slate-50 rounded-lg overflow-hidden mb-4 border border-slate-200">
                        {children}
                      </pre>
                    ),
                    // 增强表格样式
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="w-full border-collapse border border-slate-300 rounded-lg text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-cyan-50 border-b-2 border-cyan-200">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-slate-200">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-slate-50 transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-slate-700 font-semibold border border-slate-300 bg-cyan-50 whitespace-nowrap">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-slate-600 border border-slate-200">
                        {children}
                      </td>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-cyan-500 pl-4 italic text-slate-500 mb-4">
                        {children}
                      </blockquote>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} className="text-cyan-600 hover:underline">
                        {children}
                      </a>
                    ),
                    hr: () => (
                      <hr className="my-6 border-slate-200" />
                    ),
                  }}
                >
                  {processedContent}
                </ReactMarkdown>
              </div>
            )}
            {isLoading && content && (
              <span className="inline-block w-2 h-5 bg-cyan-500 animate-pulse ml-1" />
            )}
          </div>
        </TabsContent>

        <TabsContent value="source" className="mt-0 flex-1">
          <div className="p-4 h-[500px] overflow-auto">
            <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
              {content || '暂无内容'}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
