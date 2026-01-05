'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Sparkles, Loader2, Settings, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { DocTypeSelector } from '@/components/DocTypeSelector';
import { DocumentViewer } from '@/components/DocumentViewer';
import { DocumentType } from '@/lib/types';

// 示例提示
const EXAMPLE_PROMPTS: Record<DocumentType, string> = {
  requirements: `我需要开发一个在线商城系统，主要功能包括：
1. 用户注册和登录
2. 商品浏览和搜索
3. 购物车管理
4. 订单创建和支付
5. 订单查询和管理

请帮我生成详细的需求文档。`,
  design: `系统采用微服务架构，包含以下服务：
- 用户服务：处理用户认证和授权
- 商品服务：管理商品信息
- 订单服务：处理订单流程
- 支付服务：对接第三方支付

请帮我生成系统设计文档。`,
  api: `用户管理模块需要以下API：
1. 用户注册 - 接收用户名、密码、邮箱
2. 用户登录 - 返回JWT令牌
3. 获取用户信息 - 需要认证
4. 更新用户信息 - 需要认证
5. 修改密码 - 需要认证

请帮我生成API接口文档。`,
  test: `登录功能测试需求：
- 支持用户名和邮箱两种登录方式
- 密码需要加密传输
- 登录失败次数限制
- 登录成功后返回令牌

请帮我生成测试文档。`,
};

export default function GenerateFromTextPage() {
  const [description, setDescription] = useState('');
  const [docType, setDocType] = useState<DocumentType>('requirements');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useMock, setUseMock] = useState(true);

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

  // 使用示例
  const handleUseExample = () => {
    setDescription(EXAMPLE_PROMPTS[docType]);
  };

  // 生成文档
  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('请输入需求描述');
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
          type: 'text',
          docType,
          content: description,
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
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
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
              <h1 className="text-lg font-semibold text-slate-800">从描述生成文档</h1>
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
            <Card className="bg-white/80 backdrop-blur border-teal-100">
              <CardHeader>
                <CardTitle className="text-slate-800">需求描述</CardTitle>
                <CardDescription className="text-slate-500">
                  详细描述你的需求，AI 将根据描述生成相应文档
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-700">描述内容</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleUseExample}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 text-xs"
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      使用示例
                    </Button>
                  </div>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="请详细描述你的需求..."
                    className="min-h-[250px] bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:ring-teal-400"
                  />
                  <p className="text-xs text-slate-500">
                    提示：描述越详细，生成的文档质量越高
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-teal-100">
              <CardHeader>
                <CardTitle className="text-slate-800">生成配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DocTypeSelector value={docType} onChange={setDocType} />

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !description.trim()}
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
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
              title="生成的文档"
              isLoading={isLoading}
              minHeight="665px"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
