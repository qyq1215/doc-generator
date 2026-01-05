'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Loader2, ArrowLeft, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 密码强度检查
  const passwordChecks = {
    length: password.length >= 6,
    match: password === confirmPassword && confirmPassword !== '',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || !confirmPassword) {
      toast.error('请填写所有字段');
      return;
    }

    if (username.length < 3) {
      toast.error('用户名至少3个字符');
      return;
    }

    if (!passwordChecks.length) {
      toast.error('密码至少6个字符');
      return;
    }

    if (!passwordChecks.match) {
      toast.error('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, confirmPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '注册失败');
        return;
      }

      toast.success('注册成功，请登录');
      router.push('/login');
    } catch {
      toast.error('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const CheckItem = ({ checked, text }: { checked: boolean; text: string }) => (
    <div className={`flex items-center gap-2 text-sm ${checked ? 'text-green-600' : 'text-gray-400'}`}>
      {checked ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      {text}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md px-4 mt-8">
        <Card className="border border-cyan-300 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            {/* 返回首页 */}
            <div className="flex justify-start mb-4">
              <Link 
                href="/" 
                className="inline-flex items-center text-sm text-gray-600 hover:text-cyan-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回首页
              </Link>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-xl shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                创建账号
              </CardTitle>
              <CardDescription className="text-gray-500">
                注册账号以使用所有功能
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="至少3个字符"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="border-gray-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="至少6个字符"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-gray-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-700">确认密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="border-gray-200 focus:border-cyan-500 focus:ring-cyan-500"
                />
              </div>

              {/* 密码强度提示 */}
              {(password || confirmPassword) && (
                <div className="space-y-1 p-3 bg-gray-50 rounded-lg">
                  <CheckItem checked={passwordChecks.length} text="密码至少6个字符" />
                  <CheckItem checked={passwordChecks.match} text="两次密码输入一致" />
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full mt-4 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white shadow-md"
                disabled={isLoading || !passwordChecks.length || !passwordChecks.match}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注册'
                )}
              </Button>

              <p className="text-sm text-center text-gray-500">
                已有账号？{' '}
                <Link 
                  href="/login" 
                  className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                >
                  立即登录
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

