# Vercel 部署指南

## 部署步骤

### 1. 准备 GitHub 仓库

1. 在 GitHub 创建新仓库
2. 将代码推送到 GitHub：
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <你的仓库地址>
git push -u origin main
```

### 2. 在 Vercel 创建项目

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "Add New Project"
4. 导入你的 GitHub 仓库
5. **重要**：在项目设置中，进入 **Settings** → **General** → **Package Manager**，选择 **pnpm** 或 **yarn**（避免 npm 安装失败问题）
6. 选择项目，点击 "Deploy"

### 3. 配置 Vercel Postgres 数据库

1. 在 Vercel 项目页面，点击 **Storage** 标签
2. 点击 **Create Database**，选择 **Postgres**
3. 选择免费套餐（Hobby）
4. 创建数据库后，Vercel 会自动添加环境变量：
   - `POSTGRES_URL` → 映射为 `DATABASE_URL`
   - `POSTGRES_PRISMA_URL` → 映射为 `DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING` → 映射为 `DIRECT_URL`

### 4. 配置环境变量

#### 为什么要配置环境变量？

环境变量用于存储敏感信息和配置，这些信息不应该直接写在代码中：

1. **安全性**：API 密钥、数据库密码等敏感信息不会暴露在代码仓库中
2. **灵活性**：不同环境（开发/生产）可以使用不同的配置
3. **可维护性**：修改配置不需要改代码，只需更新环境变量

#### 在 Vercel 中配置环境变量的步骤：

1. 进入 Vercel 项目页面
2. 点击顶部菜单的 **Settings**（设置）
3. 在左侧菜单选择 **Environment Variables**（环境变量）
4. 点击 **Add New**（添加新变量）按钮
5. 依次添加以下变量：

#### 必需的环境变量：

**1. DATABASE_URL**
- **作用**：Prisma 连接数据库的 URL
- **如何获取**：
  - 创建 Vercel Postgres 后，Vercel 会自动添加 `POSTGRES_PRISMA_URL`
  - 在环境变量页面，找到 `POSTGRES_PRISMA_URL`，复制其值
  - 添加新变量：名称填 `DATABASE_URL`，值粘贴刚才复制的内容
- **格式示例**：`postgres://user:password@host:5432/database?sslmode=require`

**2. DIRECT_URL**
- **作用**：Prisma Migrate 使用的直连 URL（用于数据库迁移）
- **如何获取**：
  - 在环境变量页面，找到 `POSTGRES_URL_NON_POOLING`
  - 复制其值
  - 添加新变量：名称填 `DIRECT_URL`，值粘贴刚才复制的内容
- **格式示例**：`postgres://user:password@host:5432/database?sslmode=require`

**3. NEXTAUTH_SECRET**
- **作用**：NextAuth 用于加密 JWT token 的密钥
- **如何生成**：
  ```bash
  openssl rand -base64 32
  ```
  - 或者在终端运行上面的命令，会生成一个随机字符串
  - 复制生成的字符串
- **配置**：
  - 名称：`NEXTAUTH_SECRET`
  - 值：粘贴刚才生成的随机字符串
- **重要**：这个密钥必须保密，不要泄露

**4. NEXTAUTH_URL**
- **作用**：NextAuth 知道应用运行在哪个域名（用于生成回调 URL）
- **如何获取**：
  - 部署成功后，Vercel 会给你一个域名，例如：`https://your-project.vercel.app`
  - 复制这个域名
- **配置**：
  - 名称：`NEXTAUTH_URL`
  - 值：`https://your-project.vercel.app`（替换为你的实际域名）
- **注意**：如果使用自定义域名，也要更新这个值

#### 可选的环境变量（LLM API 配置）：

这些变量用于配置大语言模型 API，如果不配置，系统会使用演示模式：

- **ZHIPU_API_KEY** - 智谱 GLM API Key（从智谱 AI 官网获取）
- **XFYUN_APP_ID** - 讯飞星火 App ID（从讯飞开放平台获取）
- **XFYUN_API_KEY** - 讯飞星火 API Key
- **XFYUN_API_SECRET** - 讯飞星火 API Secret

#### 配置环境变量的注意事项：

1. **环境选择**：添加变量时，可以选择应用的环境：
   - **Production**：生产环境（正式部署）
   - **Preview**：预览环境（每次 Git push 的预览）
   - **Development**：开发环境（本地开发）
   
   建议：必需变量（DATABASE_URL、DIRECT_URL、NEXTAUTH_SECRET、NEXTAUTH_URL）选择 **Production** 和 **Preview**

2. **保存后重新部署**：添加或修改环境变量后，需要重新部署才能生效

### 5. 运行数据库迁移

#### 为什么要迁移数据库？

**数据库迁移的作用**：

1. **创建表结构**
   - 你的代码中定义了数据模型（`prisma/schema.prisma`），比如 `User`、`Account`、`Session` 等
   - 但数据库是空的，还没有这些表
   - 迁移会将代码中的模型转换为实际的数据库表

2. **同步代码和数据库**
   - 确保数据库结构与代码定义完全一致
   - 避免"代码说要有 User 表，但数据库里没有"的问题

3. **版本控制**
   - 记录数据库结构的变化历史
   - 可以回滚到之前的版本

4. **团队协作**
   - 多人开发时，确保所有人的数据库结构一致

**简单理解**：
- 代码 = 设计图纸（`schema.prisma` 定义了需要哪些表）
- 数据库 = 空房子（Vercel Postgres 是空的）
- 迁移 = 按照图纸建房子（创建表、字段、索引等）

#### 如何运行数据库迁移？

**方法 1：使用 Vercel CLI（推荐）**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目（选择你的项目）
vercel link

# 运行迁移（这会连接到 Vercel 的数据库并创建表）
npx prisma migrate deploy
```

**方法 2：在本地运行（需要配置环境变量）**

```bash
# 在项目目录下
# 确保 .env 或环境变量中有 DATABASE_URL 和 DIRECT_URL

# 运行迁移
npx prisma migrate deploy
```

**迁移会做什么？**
- 检查 `prisma/schema.prisma` 中定义的所有模型
- 在数据库中创建对应的表（User、Account、Session、VerificationToken）
- 创建索引、外键等约束
- 如果表已存在，会检查是否需要更新

**迁移成功后，你会看到：**
```
✔ Applied migration: 20250105_xxxxx_init
```

这表示数据库表已经创建成功！

### 6. 重新部署

配置完环境变量后，在 Vercel 项目页面点击 **Redeploy** 重新部署。

## 部署后访问

部署成功后，你可以通过以下方式访问：

- **生产环境**：`https://你的项目名.vercel.app`
- **预览环境**：每次 Git push 会自动创建预览链接

## 注意事项

1. **数据库迁移**：首次部署后必须运行 `prisma migrate deploy` 创建表结构
2. **环境变量**：确保所有必需的环境变量都已配置
3. **NEXTAUTH_URL**：必须设置为实际的部署域名
4. **免费额度**：
   - Vercel Hobby 计划：每月 100GB 带宽
   - Vercel Postgres Hobby：256MB 存储，每月 60 小时运行时间

## 本地开发环境变量

本地开发时，需要创建环境变量文件。Prisma 会按以下顺序读取：
1. `.env`（优先）
2. `.env.local`（如果 `.env` 中没有）

**推荐方式：创建 `.env` 文件**

在项目根目录创建 `.env` 文件：

```env
# 本地 PostgreSQL（开发用）
DATABASE_URL="postgresql://你的用户名@localhost:5432/ai_doc_generator?schema=public"
DIRECT_URL="postgresql://你的用户名@localhost:5432/ai_doc_generator?schema=public"

# NextAuth
NEXTAUTH_SECRET="你的密钥（运行 openssl rand -base64 32 生成）"
NEXTAUTH_URL="http://localhost:3000"
```

**注意**：
- `你的用户名` 替换为你的系统用户名（运行 `whoami` 查看）
- `DATABASE_URL` 和 `DIRECT_URL` 在本地开发时可以使用相同的值
- `.env` 文件不要提交到 Git（已在 `.gitignore` 中）

**首次设置本地数据库**：

```bash
# 1. 确保 PostgreSQL 正在运行
brew services start postgresql@16

# 2. 创建数据库（如果还没有）
createdb ai_doc_generator

# 3. 运行迁移创建表结构
export DIRECT_URL="postgresql://你的用户名@localhost:5432/ai_doc_generator?schema=public"
npx prisma migrate deploy
```

## 故障排查

### 问题：npm install 失败（Exit handler never called）

**解决方案**：
1. 在 Vercel 项目设置中，进入 **Settings** → **General** → **Package Manager**
2. 将包管理器从 `npm` 改为 `pnpm` 或 `yarn`
3. 保存设置并重新部署

这是 npm 在 Vercel 上的已知问题，使用 pnpm 或 yarn 可以解决。

### 问题：部署后无法连接数据库

**解决方案**：
1. 检查环境变量是否正确配置
2. 确认 Vercel Postgres 数据库已创建
3. 运行 `prisma migrate deploy` 创建表结构

### 问题：NextAuth 认证失败

**解决方案**：
1. 检查 `NEXTAUTH_URL` 是否设置为正确的域名
2. 检查 `NEXTAUTH_SECRET` 是否已配置
3. 清除浏览器 Cookie 后重试

### 问题：Prisma Client 错误

**解决方案**：
1. 确认 `package.json` 中有 `postinstall` 脚本
2. 在 Vercel 构建日志中检查 `prisma generate` 是否成功执行

## 更新部署

每次更新代码后：

1. 推送到 GitHub
2. Vercel 会自动检测并部署
3. 如果有数据库 schema 变更，需要运行迁移：
   ```bash
   npx prisma migrate deploy
   ```

