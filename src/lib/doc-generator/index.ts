import { v4 as uuidv4 } from 'uuid';
import { 
  DocumentType, 
  GenerateRequest, 
  GenerateResult, 
  LLMConfig,
  CodeMetadata 
} from '../types';
import { PromptBuilder } from '../prompts/builder';
import { createLLMAdapter, LLMProvider } from '../llm/adapter';
import { getDocTypeName } from '../prompts/templates';

/**
 * 文档生成器配置
 */
export interface DocGeneratorConfig {
  llmConfig: LLMConfig;
  promptBuilder?: PromptBuilder;
}

/**
 * 文档生成器类
 */
export class DocGenerator {
  private llmAdapter: LLMProvider;
  private promptBuilder: PromptBuilder;

  constructor(config: DocGeneratorConfig) {
    this.llmAdapter = createLLMAdapter(config.llmConfig);
    this.promptBuilder = config.promptBuilder || new PromptBuilder();
  }

  /**
   * 生成文档（非流式）
   */
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const { systemPrompt, userPrompt, metadata } = this.promptBuilder.buildFromRequest(request);

    const response = await this.llmAdapter.generateDoc(userPrompt, systemPrompt);

    return {
      id: uuidv4(),
      docType: request.docType,
      title: this.generateTitle(request.docType, request.fileName),
      content: response.content,
      metadata,
      createdAt: new Date().toISOString(),
      inputType: request.type,
    };
  }

  /**
   * 生成文档（流式）
   */
  async generateStream(
    request: GenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<GenerateResult> {
    const { systemPrompt, userPrompt, metadata } = this.promptBuilder.buildFromRequest(request);

    const response = await this.llmAdapter.generateDocStream(
      userPrompt,
      systemPrompt,
      onChunk
    );

    return {
      id: uuidv4(),
      docType: request.docType,
      title: this.generateTitle(request.docType, request.fileName),
      content: response.content,
      metadata,
      createdAt: new Date().toISOString(),
      inputType: request.type,
    };
  }

  /**
   * 测试 LLM 连接
   */
  async testConnection(): Promise<boolean> {
    return this.llmAdapter.testConnection();
  }

  /**
   * 获取代码分析结果
   */
  analyzeCode(code: string, fileName: string): CodeMetadata {
    const { metadata } = this.promptBuilder.buildFromCode(code, fileName, 'api');
    return metadata!;
  }

  /**
   * 生成文档标题
   */
  private generateTitle(docType: DocumentType, fileName?: string): string {
    const docTypeName = getDocTypeName(docType);
    if (fileName) {
      // 提取文件名（不含扩展名）
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      return `${baseName} - ${docTypeName}`;
    }
    return `${docTypeName} - ${new Date().toLocaleDateString('zh-CN')}`;
  }
}

/**
 * 创建文档生成器的工厂函数
 */
export function createDocGenerator(llmConfig: LLMConfig): DocGenerator {
  return new DocGenerator({ llmConfig });
}

/**
 * 模拟生成器（用于演示和测试，不调用真实 API）
 */
export class MockDocGenerator {
  /**
   * 模拟生成文档
   */
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      id: uuidv4(),
      docType: request.docType,
      title: `示例${getDocTypeName(request.docType)}`,
      content: this.getMockContent(request.docType),
      createdAt: new Date().toISOString(),
      inputType: request.type,
    };
  }

  /**
   * 模拟流式生成
   */
  async generateStream(
    request: GenerateRequest,
    onChunk: (chunk: string) => void
  ): Promise<GenerateResult> {
    const content = this.getMockContent(request.docType);
    const words = content.split('');
    
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 10));
      onChunk(word);
    }

    return {
      id: uuidv4(),
      docType: request.docType,
      title: `示例${getDocTypeName(request.docType)}`,
      content,
      createdAt: new Date().toISOString(),
      inputType: request.type,
    };
  }

  /**
   * 获取模拟内容
   */
  private getMockContent(docType: DocumentType): string {
    const contents: Record<DocumentType, string> = {
      requirements: `# 软件需求文档

## 1. 项目概述

本项目是一个 AI 驱动的文档生成系统，旨在帮助开发者自动生成软件工程文档。

## 2. 功能需求

### 2.1 代码分析功能
- **优先级**: 高
- **描述**: 系统能够解析用户上传的源代码文件
- **验收标准**: 支持 JavaScript、TypeScript、Python 等主流语言

### 2.2 文档生成功能
- **优先级**: 高
- **描述**: 基于 AI 大模型自动生成文档
- **验收标准**: 支持需求文档、设计文档、API文档、测试文档

## 3. 用户故事

**US-001**: 作为开发者，我希望上传代码文件后自动生成API文档，以便减少文档编写时间。

**US-002**: 作为项目经理，我希望根据需求描述生成规范的需求文档，以便统一团队文档标准。

## 4. 非功能需求

- 系统响应时间应小于 30 秒
- 支持最大 100KB 的代码文件
- 界面应支持中文`,

      design: `# 软件设计文档

## 1. 系统概述

本系统采用 Next.js 全栈架构，前后端一体化开发。

## 2. 系统架构

\`\`\`mermaid
graph TB
    subgraph Frontend[前端层]
        UI[用户界面]
        Upload[文件上传]
        Preview[文档预览]
    end
    
    subgraph Backend[后端层]
        API[API Routes]
        Parser[代码解析器]
        Generator[文档生成器]
    end
    
    subgraph External[外部服务]
        LLM[大模型API]
    end
    
    UI --> API
    Upload --> API
    API --> Parser
    Parser --> Generator
    Generator --> LLM
    LLM --> Preview
\`\`\`

## 3. 模块设计

### 3.1 代码解析模块
- 职责：解析源代码，提取结构信息
- 依赖：@babel/parser, tree-sitter

### 3.2 Prompt 工程模块
- 职责：构建高质量的 Prompt
- 依赖：代码解析模块

### 3.3 LLM 适配器模块
- 职责：封装大模型 API 调用
- 依赖：智谱 GLM / 文心一言 API`,

      api: `# API 接口文档

## 1. 概述

本文档描述了文档生成系统的 REST API 接口。

## 2. 接口列表

### 2.1 解析代码

**请求**
- **路径**: \`POST /api/parse-code\`
- **Content-Type**: \`application/json\`

**参数**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| code | string | 是 | 源代码内容 |
| fileName | string | 是 | 文件名 |

**响应示例**
\`\`\`json
{
  "success": true,
  "data": {
    "classes": [...],
    "functions": [...],
    "imports": [...]
  }
}
\`\`\`

### 2.2 生成文档

**请求**
- **路径**: \`POST /api/generate-doc\`
- **Content-Type**: \`application/json\`

**参数**

| 参数名 | 类型 | 必填 | 说明 |
|-------|------|-----|------|
| type | string | 是 | 输入类型: code/text |
| docType | string | 是 | 文档类型 |
| content | string | 是 | 内容 |`,

      test: `# 软件测试文档

## 1. 测试概述

本文档定义了文档生成系统的测试用例。

## 2. 测试范围

- 代码解析功能
- 文档生成功能
- 用户界面功能

## 3. 测试用例

| 用例ID | 模块 | 场景 | 前置条件 | 测试步骤 | 预期结果 |
|-------|------|-----|---------|---------|---------|
| TC-001 | 代码解析 | 解析JS文件 | 系统正常运行 | 1.上传JS文件 2.点击解析 | 成功提取类和函数信息 |
| TC-002 | 代码解析 | 解析空文件 | 系统正常运行 | 1.上传空文件 2.点击解析 | 提示文件为空 |
| TC-003 | 文档生成 | 生成API文档 | 已解析代码 | 1.选择API文档 2.点击生成 | 成功生成文档 |
| TC-004 | 文档生成 | 无网络连接 | 断开网络 | 1.点击生成 | 显示网络错误提示 |

## 4. 边界测试

- 超大文件（>100KB）处理
- 特殊字符处理
- 并发请求处理`,
    };

    return contents[docType];
  }
}

/**
 * 创建模拟生成器
 */
export function createMockGenerator(): MockDocGenerator {
  return new MockDocGenerator();
}

