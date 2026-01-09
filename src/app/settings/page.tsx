'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, TestTube, Loader2, CheckCircle, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface LLMConfig {
  provider: 'zhipu' | 'ernie' | 'xfyun';
  apiKey: string;
  model?: string;
  // 文心一言专用字段
  secretKey?: string;
  // 讯飞星火专用字段
  appId?: string;
  apiSecret?: string;
}

const PROVIDER_OPTIONS = [
  { value: 'zhipu', label: '智谱 GLM', models: ['glm-4-flash', 'glm-4', 'glm-4-plus'], keyHint: '输入你的 API 密钥' },
  { value: 'ernie', label: '文心一言', models: ['ernie-4.0-8k', 'ernie-3.5-8k', 'ernie-speed-8k'], keyHint: '输入你的 API 密钥（千帆API）' },
  { value: 'xfyun', label: '讯飞星火', models: ['spark-lite', 'spark-pro', 'spark-max'], keyHint: '格式: APPID:APIKey:APISecret' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<LLMConfig>({
    provider: 'zhipu',
    apiKey: '',
    model: 'glm-4-flash',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  // 加载已保存的配置
  useEffect(() => {
    const savedConfig = document.cookie
      .split('; ')
      .find(row => row.startsWith('llm-config='));
    
    if (savedConfig) {
      try {
        const parsed = JSON.parse(decodeURIComponent(savedConfig.split('=')[1]));
        
        // 处理旧格式：如果是文心一言，旧格式是组合的，现在只需要API Key部分
        if (parsed.provider === 'ernie' && parsed.apiKey && parsed.apiKey.includes(':')) {
          // 旧格式：API_KEY:SECRET_KEY，现在只需要API Key（千帆API）
          // 如果用户之前保存的是组合格式，我们取第一部分作为API Key
          // 但更好的做法是提示用户重新配置
          const [apiKey] = parsed.apiKey.split(':');
          setConfig({
            ...parsed,
            apiKey: apiKey || '',
            secretKey: undefined, // 清除旧字段
          });
        } else if (parsed.provider === 'xfyun' && parsed.apiKey && parsed.apiKey.includes(':') && !parsed.appId) {
          // 处理讯飞星火的旧格式
          const parts = parsed.apiKey.split(':');
          if (parts.length === 3) {
            setConfig({
              ...parsed,
              appId: parts[0] || '',
              apiKey: parts[1] || '',
              apiSecret: parts[2] || '',
            });
          } else {
            setConfig(parsed);
          }
        } else {
          setConfig(parsed);
        }
      } catch {
        // 忽略解析错误
      }
    }
  }, []);

  // 获取当前提供商的模型列表
  const currentProvider = PROVIDER_OPTIONS.find(p => p.value === config.provider);
  const models = currentProvider?.models || [];

  // 切换提供商时重置模型和密钥字段
  const handleProviderChange = (provider: string) => {
    const newProvider = PROVIDER_OPTIONS.find(p => p.value === provider);
    setConfig({
      provider: provider as 'zhipu' | 'ernie' | 'xfyun',
      apiKey: '',
      model: newProvider?.models[0] || '',
      // 清空分离字段（文心一言不再需要secretKey，但保留字段以兼容旧数据）
      secretKey: undefined,
      appId: undefined,
      apiSecret: undefined,
    });
    setConnectionStatus('idle');
  };

  // 验证配置是否完整
  const isConfigValid = () => {
    if (config.provider === 'zhipu') {
      return !!config.apiKey;
    }
    if (config.provider === 'ernie') {
      // 千帆API只需要API Key
      return !!config.apiKey;
    }
    if (config.provider === 'xfyun') {
      // 支持分离字段或组合格式
      return !!(config.appId && config.apiKey && config.apiSecret) || 
             (config.apiKey && config.apiKey.includes(':'));
    }
    return false;
  };

  // 测试连接
  const handleTestConnection = async () => {
    if (!isConfigValid()) {
      toast.error('请先输入完整的 API 配置');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('idle');

    try {
      // 构建测试配置（如果是分离字段，需要组合或保持分离）
      const testConfig = { ...config };
      
      // 文心一言使用千帆API，只需要API Key，不需要组合
      
      // 如果是讯飞星火且只有分离字段，组合为旧格式（向后兼容）
      if (config.provider === 'xfyun' && config.appId && config.apiKey && config.apiSecret && !config.apiKey.includes(':')) {
        testConfig.apiKey = `${config.appId}:${config.apiKey}:${config.apiSecret}`;
      }

      const response = await fetch('/api/llm/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('success');
        toast.success(data.message);
      } else {
        setConnectionStatus('error');
        toast.error(data.error || '连接测试失败');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error('连接测试失败');
      console.error(error);
    } finally {
      setIsTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!isConfigValid()) {
      toast.error('请先输入完整的 API 配置');
      return;
    }

    setIsSaving(true);

    try {
      // 将配置保存到 cookie（生产环境建议使用更安全的方式）
      // 保存时保持分离字段格式，便于后续使用
      document.cookie = `llm-config=${encodeURIComponent(JSON.stringify(config))}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30天
      toast.success('配置已保存，开始体验吧！');
      // 跳转到首页
      router.push('/');
    } catch (error) {
      toast.error('保存失败');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      {/* 导航栏 */}
      <nav className="relative z-10 border-b border-cyan-100 bg-white/70 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()}
                className="text-base text-slate-600 hover:text-cyan-700 hover:bg-cyan-100"
              >
                <ArrowLeft className="h-[1em] w-[1em] mr-1" />
                返回
              </Button>
              <div className="h-6 w-px bg-cyan-200" />
              <h1 className="text-lg font-semibold text-slate-800">系统设置</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* LLM 配置 */}
          <Card className="bg-white/80 backdrop-blur border-cyan-100">
            <CardHeader>
              <CardTitle className="text-slate-800">大模型配置</CardTitle>
              <CardDescription className="text-slate-500">
                配置用于文档生成的 AI 大模型 API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 提示信息 */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-cyan-50 border border-cyan-200">
                <Info className="h-5 w-5 text-cyan-600 shrink-0 mt-0.5" />
                <div className="text-sm text-cyan-800">
                  <p className="font-medium mb-1">如何获取 API 密钥？</p>
                  <ul className="list-disc list-inside text-cyan-700 space-y-1">
                    <li>
                      智谱 GLM: 访问 
                      <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" 
                         className="underline hover:text-cyan-900 ml-1">
                        open.bigmodel.cn
                      </a>
                      （glm-4-flash 完全免费）
                    </li>
                    <li>
                      文心一言: 访问 
                      <a href="https://cloud.baidu.com/product/wenxinworkshop" target="_blank" rel="noopener noreferrer"
                         className="underline hover:text-cyan-900 ml-1">
                        百度智能云千帆平台
                      </a>
                      （使用千帆API，只需API Key）
                    </li>
                    <li>
                      讯飞星火: 访问 
                      <a href="https://xinghuo.xfyun.cn/" target="_blank" rel="noopener noreferrer"
                         className="underline hover:text-cyan-900 ml-1">
                        xinghuo.xfyun.cn
                      </a>
                      （spark-lite 免费，格式: APPID:APIKey:APISecret）
                    </li>
                  </ul>
                </div>
              </div>

              {/* 提供商选择 */}
              <div className="space-y-2">
                <Label className="text-slate-700">选择提供商</Label>
                <Select value={config.provider} onValueChange={handleProviderChange}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-700 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {PROVIDER_OPTIONS.map(provider => (
                      <SelectItem 
                        key={provider.value} 
                        value={provider.value}
                        className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800"
                      >
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* API 密钥输入区域 */}
              {(config.provider === 'zhipu' || config.provider === 'ernie') && (
                <div className="space-y-2">
                  <Label className="text-slate-700">API 密钥</Label>
                  <Input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => {
                      setConfig({ ...config, apiKey: e.target.value });
                      setConnectionStatus('idle');
                    }}
                    placeholder={currentProvider?.keyHint || '输入你的 API 密钥'}
                    className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                  />
                </div>
              )}

              {/* 讯飞星火：3个独立输入框 */}
              {config.provider === 'xfyun' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-700">APPID</Label>
                    <Input
                      type="text"
                      value={config.appId || ''}
                      onChange={(e) => {
                        setConfig({ ...config, appId: e.target.value });
                        setConnectionStatus('idle');
                      }}
                      placeholder="输入 APPID"
                      className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">API Key</Label>
                    <Input
                      type="password"
                      value={config.apiKey}
                      onChange={(e) => {
                        setConfig({ ...config, apiKey: e.target.value });
                        setConnectionStatus('idle');
                      }}
                      placeholder="输入 API Key"
                      className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">API Secret</Label>
                    <Input
                      type="password"
                      value={config.apiSecret || ''}
                      onChange={(e) => {
                        setConfig({ ...config, apiSecret: e.target.value });
                        setConnectionStatus('idle');
                      }}
                      placeholder="输入 API Secret"
                      className="bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400"
                    />
                  </div>
                </>
              )}

              {/* 模型选择 */}
              <div className="space-y-2">
                <Label className="text-slate-700">选择模型</Label>
                <Select 
                  value={config.model} 
                  onValueChange={(value) => setConfig({ ...config, model: value })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-700 focus:border-cyan-400 focus:ring-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {models.map(model => (
                      <SelectItem 
                        key={model} 
                        value={model}
                        className="text-slate-700 focus:bg-cyan-50 focus:text-cyan-800"
                      >
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 连接状态 */}
              {connectionStatus !== 'idle' && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  connectionStatus === 'success' 
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {connectionStatus === 'success' ? 'API 连接成功' : 'API 连接失败，请检查密钥'}
                  </span>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || !isConfigValid()}
                  className="flex-1 border-slate-200 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      测试连接
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !isConfigValid()}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存配置
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 演示模式说明 */}
          <Card className="bg-white/80 backdrop-blur border-cyan-100">
            <CardHeader>
              <CardTitle className="text-slate-800">演示模式</CardTitle>
              <CardDescription className="text-slate-500">
                无需配置 API 密钥即可体验系统功能
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm">
                系统默认启用演示模式，使用预设的示例内容展示文档生成效果。
                配置真实的 API 密钥后，可以在生成页面切换到 API 模式，使用真实的 AI 大模型生成文档。
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
