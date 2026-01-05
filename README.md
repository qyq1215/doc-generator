# AI 文档生成器

基于 AI 的软件工程文档自动生成系统 - 毕业设计项目

## 功能特性

- 🔍 **智能代码分析** - 自动解析 JavaScript、TypeScript、Python 代码结构
- 📄 **多类型文档生成** - 支持需求文档、设计文档、API文档、测试文档
- 🤖 **AI 驱动** - 集成智谱GLM、文心一言等国内大模型
- ⚡ **流式生成** - 实时显示生成进度
- 📥 **多格式导出** - 支持 Markdown、纯文本、HTML 导出
- 🎮 **演示模式** - 无需 API 密钥即可体验系统功能

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **组件库**: shadcn/ui
- **代码解析**: @babel/parser
- **Markdown渲染**: react-markdown

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm start
```

## 使用指南

### 1. 演示模式（无需配置）

系统默认启用演示模式，可以直接体验文档生成功能：

1. 访问首页，选择 "从代码生成" 或 "从描述生成"
2. 上传代码文件或输入需求描述
3. 选择要生成的文档类型
4. 点击 "生成文档"
5. 查看生成结果并导出

### 2. API 模式（需要配置）

配置真实的大模型 API 后，可以使用 AI 生成高质量文档：

1. 访问 "设置" 页面
2. 选择 LLM 提供商（智谱GLM / 文心一言）
3. 输入 API 密钥
4. 测试连接并保存配置
5. 在生成页面切换到 "API模式"

### 获取 API 密钥

- **智谱 GLM**: [https://open.bigmodel.cn/](https://open.bigmodel.cn/)
- **文心一言**: [https://cloud.baidu.com/product/wenxinworkshop](https://cloud.baidu.com/product/wenxinworkshop)

## 项目结构

```
ai-doc-generator/
├── src/
│   ├── app/                    # 页面路由
│   │   ├── api/               # API 路由
│   │   ├── generate/          # 生成页面
│   │   └── settings/          # 设置页面
│   ├── components/            # UI 组件
│   │   ├── ui/               # shadcn 组件
│   │   ├── CodeUploader.tsx  # 代码上传
│   │   ├── DocumentViewer.tsx # 文档预览
│   │   ├── DocTypeSelector.tsx # 类型选择
│   │   └── ExportButton.tsx  # 导出按钮
│   └── lib/                   # 核心库
│       ├── code-parser/      # 代码解析器
│       ├── llm/              # LLM 适配器
│       ├── prompts/          # Prompt 模板
│       └── doc-generator/    # 文档生成器
├── DESIGN_PLAN.md             # 设计方案
├── PROGRESS.md                # 进度记录
└── package.json
```

## 支持的文档类型

| 类型 | 说明 |
|-----|------|
| 需求文档 | 用户故事、功能需求、非功能需求 |
| 设计文档 | 系统架构、模块设计、类设计 |
| API文档 | 接口说明、参数定义、示例代码 |
| 测试文档 | 测试用例、边界条件、异常场景 |

## 许可证

MIT License

## 作者

毕业设计项目
