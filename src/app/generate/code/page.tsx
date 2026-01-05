'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { CodeUploader } from '@/components/CodeUploader';
import { DocTypeSelector } from '@/components/DocTypeSelector';
import { DocumentViewer } from '@/components/DocumentViewer';
import { DocumentType } from '@/lib/types';

export default function GenerateFromCodePage() {
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [docType, setDocType] = useState<DocumentType>('api');
  const [additionalContext, setAdditionalContext] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useMock, setUseMock] = useState(true); // 默认使用演示模式

  // 检查是否已配置 API，如果配置了则默认使用 API 模式
  useEffect(() => {
    const savedConfig = document.cookie
      .split('; ')
      .find(row => row.startsWith('llm-config='));
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(decodeURIComponent(savedConfig.split('=')[1]));
        if (parsed.apiKey) {
          setUseMock(false); // 已配置 API，使用 API 模式
        }
      } catch {
        // 忽略解析错误
      }
    }
  }, []);

  // 处理代码变化
  const handleCodeChange = useCallback((newCode: string, newFileName: string) => {
    setCode(newCode);
    setFileName(newFileName);
  }, []);

  // 生成文档
  const handleGenerate = async () => {
    if (!code.trim()) {
      toast.error('请先上传或输入代码');
      return;
    }

    setIsLoading(true);
    setGeneratedContent('');
    
    // 滚动到页面顶部（延迟执行以确保状态更新后生效）
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);

    try {
      const response = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'code',
          docType,
          content: code,
          fileName,
          additionalContext: additionalContext.trim() || undefined,
          stream: true,
          useMock,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.needConfig) {
          toast.error('请先配置 LLM API 密钥', {
            action: {
              label: '去配置',
              onClick: () => window.location.href = '/settings',
            },
          });
          return;
        }
        throw new Error(error.error || '生成失败');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            if (data.chunk) {
              setGeneratedContent(prev => prev + data.chunk);
            }
            
            if (data.done) {
              toast.success('文档生成完成');
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              console.error('解析响应失败:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('生成文档失败:', error);
      toast.error(error instanceof Error ? error.message : '生成文档失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      {/* 导航栏 */}
      <nav className="relative z-10 border-b border-cyan-100 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-base text-slate-600 hover:text-cyan-700 hover:bg-cyan-100">
                  <ArrowLeft className="h-[1em] w-[1em] mr-1" />
                  返回
                </Button>
              </Link>
              <div className="h-6 w-px bg-cyan-200" />
              <h1 className="text-lg font-semibold text-slate-800">从代码生成文档</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={useMock ? "secondary" : "outline"}
                size="sm"
                onClick={() => setUseMock(!useMock)}
                className={`text-xs ${useMock ? 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' : 'border-slate-200 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200'}`}
              >
                {useMock ? '演示模式' : 'API模式'}
              </Button>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-cyan-700 hover:bg-cyan-100">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：输入区域 */}
          <div className="space-y-6">
            <Card className="bg-white/80 backdrop-blur border-cyan-100">
              <CardHeader>
                <CardTitle className="text-slate-800">上传代码</CardTitle>
                <CardDescription className="text-slate-500">
                  上传代码文件或直接粘贴代码内容
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CodeUploader onCodeChange={handleCodeChange} />
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-cyan-100">
              <CardHeader>
                <CardTitle className="text-slate-800">生成配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DocTypeSelector value={docType} onChange={setDocType} />

                <div className="space-y-2">
                  <Label className="text-slate-700">补充说明（可选）</Label>
                  <Textarea
                    value={additionalContext}
                    onChange={(e) => setAdditionalContext(e.target.value)}
                    placeholder="添加任何额外的上下文信息或特殊要求..."
                    className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !code.trim()}
                  className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      生成文档
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：预览区域 */}
          <div>
            <DocumentViewer
              content={generatedContent}
              title={fileName ? `${fileName} - 文档` : '生成的文档'}
              isLoading={isLoading}
              minHeight="665px"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
