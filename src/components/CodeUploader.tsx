'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileCode, X, AlertCircle } from 'lucide-react';
import { getLanguageFromFileName, SUPPORTED_LANGUAGES } from '@/lib/code-parser';

interface CodeUploaderProps {
  onCodeChange: (code: string, fileName: string) => void;
  maxSize?: number; // 最大文件大小（字节）
}

export function CodeUploader({ onCodeChange, maxSize = 100 * 1024 }: CodeUploaderProps) {
  const [code, setCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFile = useCallback(async (file: File) => {
    setError(null);

    // 检查文件大小
    if (file.size > maxSize) {
      setError(`文件过大，最大支持 ${Math.round(maxSize / 1024)} KB`);
      return;
    }

    // 检查文件类型
    const language = getLanguageFromFileName(file.name);
    if (!language) {
      setError(`不支持的文件类型。支持的类型: ${SUPPORTED_LANGUAGES.join(', ')}`);
      return;
    }

    // 读取文件内容
    try {
      const content = await file.text();
      setCode(content);
      setFileName(file.name);
      onCodeChange(content, file.name);
    } catch {
      setError('读取文件失败');
    }
  }, [maxSize, onCodeChange]);

  // 处理拖拽
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // 处理文件输入
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // 处理手动输入代码
  const handleCodeInput = useCallback((value: string) => {
    setCode(value);
    // 如果没有文件名，使用默认名称
    const name = fileName || 'code.js';
    setFileName(name);
    onCodeChange(value, name);
  }, [fileName, onCodeChange]);

  // 清除代码
  const handleClear = useCallback(() => {
    setCode('');
    setFileName('');
    setError(null);
    onCodeChange('', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onCodeChange]);

  return (
    <div className="space-y-4">
      {/* 文件上传区域 */}
      <Card
        className={`
          relative border-2 border-dashed transition-colors cursor-pointer
          ${isDragging 
            ? 'border-cyan-500 bg-cyan-50' 
            : 'border-slate-200 hover:border-cyan-300 bg-white'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".js,.jsx,.ts,.tsx,.py"
            onChange={handleFileInput}
          />
          
          <Upload className={`h-10 w-10 mx-auto mb-4 ${isDragging ? 'text-cyan-600' : 'text-slate-400'}`} />
          
          <p className="text-slate-700 mb-2">
            拖拽文件到这里，或点击选择文件
          </p>
          <p className="text-sm text-slate-500">
            支持 JavaScript, TypeScript, Python 文件
          </p>
        </div>
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 已选择的文件 */}
      {fileName && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-cyan-50 border border-cyan-200">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-cyan-600" />
            <span className="text-slate-700">{fileName}</span>
            <span className="text-xs text-slate-500">
              ({Math.round(code.length / 1024 * 100) / 100} KB)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 分隔线 */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-sm text-slate-500">或直接粘贴代码</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* 代码输入区域 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-slate-700">代码内容</Label>
          {code && (
            <span className="text-xs text-slate-500">
              {code.split('\n').length} 行
            </span>
          )}
        </div>
        <Textarea
          value={code}
          onChange={(e) => handleCodeInput(e.target.value)}
          placeholder="在此粘贴你的代码..."
          className="h-[250px] max-h-[250px] resize-none font-mono text-sm bg-white border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-400 overflow-auto"
        />
      </div>
    </div>
  );
}
