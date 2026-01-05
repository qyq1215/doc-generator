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
5. 选择项目，点击 "Deploy"

### 3. 配置 Vercel Postgres 数据库

1. 在 Vercel 项目页面，点击 **Storage** 标签
2. 点击 **Create Database**，选择 **Postgres**
3. 选择免费套餐（Hobby）
4. 创建数据库后，Vercel 会自动添加环境变量：
   - `POSTGRES_URL` → 映射为 `DATABASE_URL`
   - `POSTGRES_PRISMA_URL` → 映射为 `DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING` → 映射为 `DIRECT_URL`

### 4. 配置环境变量

在 Vercel 项目设置中，添加以下环境变量：

#### 必需的环境变量：

1. **DATABASE_URL**
   - 从 Vercel Postgres 自动获取（`POSTGRES_PRISMA_URL`）

2. **DIRECT_URL**
   - 从 Vercel Postgres 自动获取（`POSTGRES_URL_NON_POOLING`）

3. **NEXTAUTH_SECRET**
   - 生成方式：`openssl rand -base64 32`
   - 或使用在线工具生成随机字符串

4. **NEXTAUTH_URL**
   - 生产环境：`https://你的域名.vercel.app`
   - 例如：`https://ai-doc-generator.vercel.app`

#### 可选的环境变量（LLM API 配置）：

- `ZHIPU_API_KEY` - 智谱 GLM API Key
- `XFYUN_APP_ID` - 讯飞星火 App ID
- `XFYUN_API_KEY` - 讯飞星火 API Key
- `XFYUN_API_SECRET` - 讯飞星火 API Secret

### 5. 运行数据库迁移

部署后，需要在 Vercel 运行数据库迁移：

**方法 1：使用 Vercel CLI（推荐）**

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 链接项目
vercel link

# 运行迁移
npx prisma migrate deploy
```

**方法 2：在 Vercel 项目设置中运行**

1. 在 Vercel 项目页面，进入 **Settings** → **Deploy Hooks**
2. 创建一个部署钩子，触发时运行：
   ```bash
   npx prisma migrate deploy
   ```

**方法 3：使用 Vercel 的 Post Deploy Hook**

在 `package.json` 中添加：
```json
{
  "scripts": {
    "postdeploy": "prisma migrate deploy"
  }
}
```

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

本地开发时，创建 `.env.local` 文件：

```env
# 本地 PostgreSQL（开发用）
DATABASE_URL="postgresql://temptrip@localhost:5432/ai_doc_generator?schema=public"
DIRECT_URL="postgresql://temptrip@localhost:5432/ai_doc_generator?schema=public"

# NextAuth
NEXTAUTH_SECRET="你的密钥"
NEXTAUTH_URL="http://localhost:3000"
```

## 故障排查

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

