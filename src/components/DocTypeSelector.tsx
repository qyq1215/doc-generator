'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FileText, Layout, Code, TestTube } from 'lucide-react';
import { DOC_TYPE_CONFIG, DocumentType } from '@/lib/types';
import { cn } from '@/lib/utils';

const iconMap = {
  FileText,
  Layout,
  Code,
  TestTube,
};

interface DocTypeSelectorProps {
  value: DocumentType;
  onChange: (value: DocumentType) => void;
}

export function DocTypeSelector({ value, onChange }: DocTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-slate-700">选择文档类型</Label>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(DOC_TYPE_CONFIG) as DocumentType[]).map((type) => {
          const config = DOC_TYPE_CONFIG[type];
          const IconComponent = iconMap[config.icon as keyof typeof iconMap];
          const isSelected = value === type;
          
          // 青色系配色映射
          const colorStyles: Record<string, { bg: string; icon: string; selectedBg: string }> = {
            'bg-blue-500': { bg: 'bg-sky-50', icon: 'text-sky-600', selectedBg: 'bg-sky-100' },
            'bg-purple-500': { bg: 'bg-violet-50', icon: 'text-violet-600', selectedBg: 'bg-violet-100' },
            'bg-green-500': { bg: 'bg-emerald-50', icon: 'text-emerald-600', selectedBg: 'bg-emerald-100' },
            'bg-orange-500': { bg: 'bg-amber-50', icon: 'text-amber-600', selectedBg: 'bg-amber-100' },
          };
          const style = colorStyles[config.color] || { bg: 'bg-cyan-50', icon: 'text-cyan-600', selectedBg: 'bg-cyan-100' };
          
          return (
            <Card
              key={type}
              className={cn(
                'cursor-pointer transition-all duration-200 p-4',
                isSelected
                  ? 'bg-cyan-50 border-cyan-400 ring-1 ring-cyan-400/30'
                  : 'bg-white border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30'
              )}
              onClick={() => onChange(type)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? style.selectedBg : style.bg
                )}>
                  <IconComponent className={cn(
                    'h-5 w-5',
                    style.icon
                  )} />
                </div>
                <div className="min-w-0">
                  <h3 className={cn(
                    'font-medium mb-1',
                    isSelected ? 'text-cyan-700' : 'text-slate-700'
                  )}>
                    {config.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {config.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
