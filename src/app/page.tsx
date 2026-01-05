'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Layout, Code, TestTube, Upload, MessageSquare, Settings, Sparkles } from 'lucide-react';
import { DOC_TYPE_CONFIG, DocumentType } from '@/lib/types';

const iconMap = {
  FileText,
  Layout,
  Code,
  TestTube,
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      {/* 装饰背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-emerald-200/20 rounded-full blur-2xl" />
      </div>

      {/* 导航栏 */}
      <nav className="relative z-10 border-b border-cyan-100 bg-white/70 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-cyan-600" />
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                AI 文档生成器
              </span>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="text-lg text-slate-600 hover:text-cyan-700 hover:bg-cyan-50">
                <Settings className="h-20 w-200 mr-2" />
                设置
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero 区域 */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 bg-cyan-100 text-cyan-700 border-cyan-200">
            基于 AI 的智能文档生成
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 mb-4">
            <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">          
            软件工程文档自动生成系统
            </span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            上传代码或输入需求描述，AI 自动生成专业的软件工程文档。
            支持需求文档、设计文档、API文档、测试文档。
          </p>
        </div>

        {/* 输入方式选择 */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Link href="/generate/code" className="block group">
            <Card className="h-full bg-white/80 backdrop-blur border-cyan-100 hover:border-cyan-300 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-100">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center mb-4 group-hover:bg-cyan-200 transition-colors">
                  <Upload className="h-6 w-6 text-cyan-600" />
                </div>
                <CardTitle className="text-slate-800">从代码生成</CardTitle>
                <CardDescription className="text-slate-500">
                  上传源代码文件，AI 自动分析代码结构并生成相应文档
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50">JavaScript</Badge>
                  <Badge variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50">TypeScript</Badge>
                  <Badge variant="outline" className="text-cyan-700 border-cyan-200 bg-cyan-50">Python</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/generate/text" className="block group">
            <Card className="h-full bg-white/80 backdrop-blur border-teal-100 hover:border-teal-300 transition-all duration-300 hover:shadow-lg hover:shadow-teal-100">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                  <MessageSquare className="h-6 w-6 text-teal-600" />
                </div>
                <CardTitle className="text-slate-800">从描述生成</CardTitle>
                <CardDescription className="text-slate-500">
                  输入需求描述或功能说明，AI 帮你生成专业的工程文档
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">自然语言</Badge>
                  <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">需求描述</Badge>
                  <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50">功能说明</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 支持的文档类型 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">支持的文档类型</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.keys(DOC_TYPE_CONFIG) as DocumentType[]).map((type) => {
              const config = DOC_TYPE_CONFIG[type];
              const IconComponent = iconMap[config.icon as keyof typeof iconMap];
              
              // 青色系配色
              const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
                'bg-blue-500': { bg: 'bg-sky-50', text: 'text-sky-600', iconBg: 'bg-sky-100' },
                'bg-purple-500': { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-100' },
                'bg-green-500': { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
                'bg-orange-500': { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
              };
              const colors = colorMap[config.color] || { bg: 'bg-cyan-50', text: 'text-cyan-600', iconBg: 'bg-cyan-100' };
              
              return (
                <Card key={type} className={`${colors.bg} border-transparent`}>
                  <CardHeader className="pb-2">
                    <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center mb-2`}>
                      <IconComponent className={`h-5 w-5 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-lg text-slate-800">{config.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600">{config.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* 特性介绍 */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-8">核心特性</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-white/60 backdrop-blur">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Code className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">智能代码分析</h3>
              <p className="text-slate-600">自动解析代码结构，提取类、函数、接口等关键信息</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/60 backdrop-blur">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">AI 驱动生成</h3>
              <p className="text-slate-600">基于大语言模型，生成专业、准确的工程文档</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/60 backdrop-blur">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">多格式导出</h3>
              <p className="text-slate-600">支持 Markdown、PDF、Word 等多种格式导出</p>
            </div>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="relative z-10 border-t border-cyan-100 py-8 mt-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            基于 AI 的软件工程文档自动生成系统
          </p>
        </div>
      </footer>
    </div>
  );
}
