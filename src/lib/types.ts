// 文档类型枚举
export type DocumentType = 'requirements' | 'design' | 'api' | 'test';

// 文档类型配置
export const DOC_TYPE_CONFIG: Record<DocumentType, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  requirements: {
    name: '需求文档',
    description: '根据代码或描述生成用户故事、功能需求说明',
    icon: 'FileText',
    color: 'bg-blue-500',
  },
  design: {
    name: '设计文档',
    description: '分析系统架构，生成模块设计、类设计说明',
    icon: 'Layout',
    color: 'bg-purple-500',
  },
  api: {
    name: 'API文档',
    description: '提取接口定义，生成API接口说明文档',
    icon: 'Code',
    color: 'bg-green-500',
  },
  test: {
    name: '测试文档',
    description: '分析函数逻辑，生成测试用例和测试计划',
    icon: 'TestTube',
    color: 'bg-orange-500',
  },
};

// 代码元数据类型
export interface CodeMetadata {
  fileName: string;
  language: string;
  classes: ClassInfo[];
  functions: FunctionInfo[];
  interfaces: InterfaceInfo[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  comments: CommentInfo[];
  rawCode: string;
}

export interface ClassInfo {
  name: string;
  superClass?: string;
  implements?: string[];
  properties: PropertyInfo[];
  methods: MethodInfo[];
  comments?: string[];
  startLine: number;
  endLine: number;
}

export interface FunctionInfo {
  name: string;
  params: ParamInfo[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  comments?: string[];
  body?: string;
  startLine: number;
  endLine: number;
}

export interface InterfaceInfo {
  name: string;
  extends?: string[];
  properties: PropertyInfo[];
  methods: MethodSignature[];
  comments?: string[];
  startLine: number;
  endLine: number;
}

export interface PropertyInfo {
  name: string;
  type?: string;
  isOptional: boolean;
  isReadonly: boolean;
  defaultValue?: string;
  comments?: string[];
}

export interface MethodInfo {
  name: string;
  params: ParamInfo[];
  returnType?: string;
  isAsync: boolean;
  isStatic: boolean;
  visibility: 'public' | 'private' | 'protected';
  comments?: string[];
}

export interface MethodSignature {
  name: string;
  params: ParamInfo[];
  returnType?: string;
}

export interface ParamInfo {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
}

export interface ExportInfo {
  name: string;
  isDefault: boolean;
  type: 'class' | 'function' | 'variable' | 'interface' | 'type';
}

export interface CommentInfo {
  type: 'line' | 'block' | 'jsdoc';
  content: string;
  startLine: number;
  endLine: number;
}

// 生成请求类型
export interface GenerateRequest {
  type: 'code' | 'text';
  docType: DocumentType;
  content: string; // 代码内容或文本描述
  fileName?: string;
  language?: string;
  additionalContext?: string;
}

// 生成结果类型
export interface GenerateResult {
  id: string;
  docType: DocumentType;
  title: string;
  content: string;
  metadata?: CodeMetadata;
  createdAt: string;
  inputType: 'code' | 'text';
}

// LLM配置类型
export interface LLMConfig {
  provider: 'zhipu' | 'ernie' | 'xfyun';
  apiKey: string; // 用于zhipu，或ernie的API Key部分，或xfyun的APIKey部分
  model?: string;
  // 文心一言专用字段
  secretKey?: string; // 文心一言的Secret Key
  // 讯飞星火专用字段
  appId?: string; // 讯飞星火的APPID
  apiSecret?: string; // 讯飞星火的APISecret
}

// LLM响应类型
export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// API错误类型
export interface APIError {
  code: string;
  message: string;
  details?: unknown;
}

