---
title: "从零开始：搭建你的第一个 AI 辅助开发环境"
description: "手把手教你配置 Claude Code，从安装到高级配置，打造高效的 AI 开发工作流"
date: 2026-05-12
categories: ["Tutorial"]
tags: ["Claude Code", "Setup", "Configuration", "Getting Started"]
series: "AI 开发工具系列"
---

# 从零开始：搭建你的第一个 AI 辅助开发环境

## 前言

很多开发者想尝试 AI 辅助开发，但不知道从哪里开始。本文是一份完整的入门指南，涵盖：

- Claude Code 的安装和配置
- 基础使用技巧
- 常见问题排查
- 进阶配置

**预计阅读时间**：30 分钟
**实践时间**：1-2 小时

## 第一部分：选择合适的工具

### Claude Code vs 其他工具

| 工具 | 优势 | 劣势 | 适合人群 |
|------|------|------|---------|
| **Claude Code** | 上下文最长（200K）<br>工具能力最强<br>代码质量高 | 按 token 计费<br>需要网络 | 专业开发者<br>复杂项目 |
| **GitHub Copilot** | 集成度高<br>速度快<br>价格固定 | 上下文短（8K）<br>无工具调用 | 日常编码<br>简单补全 |
| **Cursor** | 一体化 IDE<br>UI 友好 | 功能较少<br>定制性差 | 初学者<br>小项目 |
| **本地模型** | 隐私保护<br>无网络依赖 | 需要 GPU<br>能力较弱 | 企业内部<br>敏感代码 |

**本文选择 Claude Code**，因为它功能最全面，适合学习 AI 辅助开发的核心概念。

## 第二部分：安装 Claude Code

### 方式 1：CLI 工具（推荐）

**优势**：轻量、灵活、适合终端用户

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | sh

# 或者用 Homebrew
brew install anthropic/tap/claude-code

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```

**验证安装**：
```bash
claude-code --version
# 输出：claude-code 1.5.2
```

### 方式 2：Desktop App

**优势**：图形界面、更直观

1. 访问 [claude.ai/code](https://claude.ai/code)
2. 下载对应平台的安装包
3. 安装并启动

### 方式 3：IDE 扩展

**VS Code**：
```bash
code --install-extension anthropic.claude-code
```

**JetBrains**：
1. 打开 Settings → Plugins
2. 搜索 "Claude Code"
3. 安装并重启

## 第三部分：配置 Claude Code

### 3.1 认证

```bash
# 登录（会打开浏览器）
claude-code auth login

# 验证登录状态
claude-code auth whoami
# 输出：Logged in as: your-email@example.com
```

### 3.2 基础配置

创建配置文件 `~/.claude/config.json`：

```json
{
  "model": "opus-4.7",
  "permissions": {
    "Read": "allow",
    "Edit": "allow",
    "Write": "confirm",
    "Bash": "confirm",
    "Agent": "allow"
  },
  "context": {
    "maxTokens": 200000,
    "autoCompress": true
  },
  "ui": {
    "theme": "dark",
    "fontSize": 14
  }
}
```

**配置说明**：
- `model`: 使用的模型（opus-4.7 最强，sonnet-4.6 更快）
- `permissions`: 工具权限（allow 自动执行，confirm 需确认）
- `context.autoCompress`: 接近 token 限制时自动压缩
- `ui`: 界面设置

### 3.3 项目级配置

在项目根目录创建 `.claude/config.json`：

```json
{
  "ignore": [
    "node_modules/",
    "dist/",
    ".git/",
    "*.log"
  ],
  "rules": [
    "Use TypeScript strict mode",
    "Follow Airbnb style guide",
    "Write tests for all new features"
  ],
  "memory": {
    "enabled": true,
    "path": ".claude/memory/"
  }
}
```

**配置说明**：
- `ignore`: Claude 不会读取这些文件/目录
- `rules`: 项目特定的编码规范
- `memory`: 启用项目级 memory

## 第四部分：第一个任务

### 任务：创建一个 Express API

**步骤 1：启动 Claude Code**

```bash
cd ~/projects/my-api
claude-code
```

**步骤 2：描述需求**

```
你：「创建一个 Express API 项目，包含：
    - GET /health 健康检查
    - GET /users 获取用户列表
    - POST /users 创建用户
    - 用 TypeScript
    - 加单元测试」

Claude：「好的，我会创建以下文件：
        1. package.json（依赖配置）
        2. tsconfig.json（TypeScript 配置）
        3. src/index.ts（入口文件）
        4. src/routes/users.ts（用户路由）
        5. src/tests/users.test.ts（测试）

        开始吗？」

你：「开始」

Claude：[创建 5 个文件]
       [运行 npm install]
       [运行 npm test]

       「完成！所有测试通过。
        运行 npm start 启动服务器。」
```

**步骤 3：验证**

```bash
npm start
# 服务器启动在 http://localhost:3000

curl http://localhost:3000/health
# 输出：{"status":"ok"}

curl http://localhost:3000/users
# 输出：[]
```

**步骤 4：迭代改进**

```
你：「加一个 GET /users/:id 接口」

Claude：[修改 src/routes/users.ts]
       [加测试]

       「已添加。测试通过。」

你：「用 MongoDB 存储用户数据」

Claude：「需要安装 mongoose。我会：
        1. 添加 mongoose 依赖
        2. 创建 User model
        3. 更新路由使用数据库
        4. 加 Docker Compose 配置（本地 MongoDB）

        继续吗？」

你：「继续」

Claude：[执行 4 个步骤]
       「完成。运行 docker-compose up -d 启动 MongoDB。」
```

## 第五部分：常见问题

### 问题 1：Claude 读不到文件

**症状**：
```
你：「读取 src/index.ts」
Claude：「文件不存在」
```

**原因**：工作目录不对

**解决**：
```bash
# 检查当前目录
pwd

# 切换到项目根目录
cd /path/to/project

# 重新启动 Claude Code
claude-code
```

### 问题 2：Token 用完了

**症状**：
```
Error: Token limit exceeded (200,000 tokens)
```

**原因**：上下文太长

**解决**：
```
你：「总结当前会话，压缩上下文」

Claude：[压缩历史消息]
       「已压缩。当前 token 使用：50,000 / 200,000」
```

**预防**：
- 定期开新会话
- 启用 `autoCompress`
- 避免读取大文件（如 `node_modules/`）

### 问题 3：Claude 改错了文件

**症状**：Claude 修改了不该改的文件

**解决**：
```bash
# 查看改动
git diff

# 回滚
git checkout -- <file>

# 或者撤销所有改动
git reset --hard HEAD
```

**预防**：
- 每次任务前 commit
- 用 `.claude/config.json` 的 `ignore` 排除敏感文件
- 设置 `Write: "confirm"` 权限

### 问题 4：Claude 生成的代码有 bug

**症状**：代码跑不通或有逻辑错误

**解决**：
```
你：「这段代码有 bug，报错：[贴错误信息]」

Claude：「抱歉，我看到问题了。是因为...
        我会修复：[说明修复方案]」
```

**预防**：
- 每步都运行测试
- 用 `typecheck` 验证类型
- Code review（不要盲目信任 AI）

## 第六部分：进阶配置

### 6.1 Memory 系统

创建 `.claude/memory/` 目录：

```bash
mkdir -p .claude/memory
```

**user.md**（你的偏好）：
```markdown
---
type: user
---
我是全栈工程师，熟悉 TypeScript、React、Node.js。
偏好函数式编程，避免 class。
```

**feedback.md**（纠正 Claude）：
```markdown
---
type: feedback
---
不要用 `any` 类型，用 `unknown` 或具体类型。
**Why**: 类型安全
**How to apply**: 所有 TypeScript 代码
```

**project.md**（项目背景）：
```markdown
---
type: project
---
这是一个博客 API，用 Express + MongoDB。
当前在重构认证模块，目标是支持 OAuth2。
```

### 6.2 自定义工具

创建 `.claude/tools/` 目录：

```bash
mkdir -p .claude/tools
```

**deploy.sh**（部署脚本）：
```bash
#!/bin/bash
# 部署到 staging 环境

set -e

echo "🚀 Deploying to staging..."

# 运行测试
npm test

# 构建
npm run build

# 部署
scp -r dist/ user@staging-server:/var/www/app/

echo "✅ Deployed successfully"
```

**在 Claude Code 中使用**：
```
你：「部署到 staging」

Claude：[运行 .claude/tools/deploy.sh]
       「部署成功！」
```

### 6.3 快捷命令

在 `~/.claude/aliases.json` 中定义：

```json
{
  "test": "npm test",
  "lint": "npm run lint",
  "deploy": ".claude/tools/deploy.sh",
  "review": "git diff main...HEAD | claude-code review"
}
```

**使用**：
```
你：「/test」
Claude：[运行 npm test]

你：「/review」
Claude：[审查当前 PR]
```

## 第七部分：最佳实践

### 1. 小步快跑

**❌ 不好**：
```
「重构整个项目」
```

**✅ 好**：
```
「先列出需要重构的模块」
→ 审查清单
「重构第一个模块：UserService」
→ 验证
「重构第二个模块：AuthMiddleware」
→ 验证
...
```

### 2. 明确验证标准

**❌ 不好**：
```
「优化性能」
```

**✅ 好**：
```
「优化 /api/posts 接口，目标：
 - 响应时间从 800ms 降到 < 300ms
 - 验证方式：运行 ab -n 1000 -c 10
 - 不能破坏现有功能（所有测试通过）」
```

### 3. 利用 Git

**每个任务前**：
```bash
git checkout -b feature/new-feature
git commit -m "Checkpoint before AI changes"
```

**任务完成后**：
```bash
git diff  # 审查改动
git add .
git commit -m "feat: implement new feature (AI-assisted)"
```

### 4. 定期清理

**每周**：
- 清理 `.claude/` 缓存
- 更新 memory 文件
- 回顾 AI 生成的代码质量

```bash
# 清理缓存
rm -rf .claude/cache/

# 查看 memory 使用情况
du -sh .claude/memory/
```

## 第八部分：学习资源

### 官方文档
- [Claude Code 文档](https://docs.anthropic.com/claude-code)
- [Prompt Engineering 指南](https://docs.anthropic.com/claude/docs/prompt-engineering)

### 社区资源
- [Claude Code GitHub](https://github.com/anthropics/claude-code)
- [Discord 社区](https://discord.gg/anthropic)
- [Reddit r/ClaudeAI](https://reddit.com/r/ClaudeAI)

### 视频教程
- [Claude Code 入门（YouTube）](https://youtube.com/watch?v=...)
- [高级技巧系列（Bilibili）](https://bilibili.com/video/...)

## 结语

恭喜！你已经完成了 AI 辅助开发环境的搭建。

**下一步**：
1. 用 Claude Code 完成一个真实项目
2. 记录遇到的问题和解决方案
3. 分享经验给团队

**记住**：
- AI 是工具，不是魔法
- 始终审查 AI 的输出
- 多实践，多总结

**最后的建议**：给自己 2 周时间适应 AI 辅助开发。前几天可能会觉得「还不如自己写」，但坚持下来，你会发现效率提升是实实在在的。

---

**作者简介**
全栈工程师，Claude Code 早期用户。从 2024 年开始用 AI 辅助开发，现在 80% 的代码由 AI 生成。写这篇教程是为了帮助更多人跨过入门门槛。

**有问题？**
- 在评论区留言
- 或者发邮件到 your-email@example.com
