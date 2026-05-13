---
title: "Prompt Engineering 实战：如何让 Claude Code 理解你的意图"
description: "从基础到进阶，系统性掌握与 AI 编程助手沟通的技巧，附 20+ 实战案例"
date: 2026-05-12
categories: ["Best Practices"]
tags: ["Prompt Engineering", "Claude Code", "Communication", "Productivity"]
series: "AI 开发工具系列"
---

# Prompt Engineering 实战：如何让 Claude Code 理解你的意图

## 前言

很多开发者第一次用 Claude Code 时会有这样的体验：

> 「我让它重构一个函数，它把整个文件都改了」
> 「我只想让它解释这段代码，它却开始重写」
> 「我说『优化性能』，它不知道从哪下手」

问题不在于 AI 不够聪明，而在于**你没说清楚**。

Prompt Engineering 不是玄学，而是一门可以系统学习的技能。本文将从原理到实践，教你如何与 Claude Code 高效沟通。

## 第一部分：基础原则

### 原则 1：明确目标

**❌ 模糊 Prompt**
```
「优化这个函数」
```

**问题**：
- 优化什么？性能？可读性？内存占用？
- 优化到什么程度？
- 有什么约束？

**✅ 清晰 Prompt**
```
「这个函数在处理 10K+ 元素数组时很慢（当前 O(n²)）。
请优化到 O(n log n) 或更好，保持现有 API 不变，
加单元测试验证正确性。」
```

**效果对比**：

| 维度 | 模糊 Prompt | 清晰 Prompt |
|------|------------|------------|
| 成功率 | 40% | 95% |
| 迭代次数 | 3-5 次 | 1-2 次 |
| 结果质量 | 不可预测 | 符合预期 |

### 原则 2：提供上下文

Claude Code 虽然有 200K 上下文窗口，但它不会自动读取所有文件。你需要**主动提供**相关信息。

**❌ 缺乏上下文**
```
「加一个登录功能」
```

**✅ 充足上下文**
```
「在现有的 Express + JWT 架构下，加一个登录功能。
参考 /routes/auth.ts 里的注册逻辑，复用 generateToken() 函数。
登录接口：POST /api/auth/login，接收 email + password，
返回 { token, user }。失败时返回 401。」
```

**上下文清单**：
- 技术栈（框架、库、版本）
- 现有代码位置（文件路径、函数名）
- 约束条件（性能要求、兼容性、安全规范）
- 预期输出（API 格式、返回值、副作用）

### 原则 3：分步执行

复杂任务一次性完成容易出错。拆成小步骤，每步验证。

**❌ 一次性大任务**
```
「把这个 2000 行的文件重构成模块化架构」
```
**风险**：
- Claude 可能理解错架构
- 中途出错难以回滚
- 验证困难

**✅ 分步执行**
```
第 1 步：「分析这个文件，列出可以抽离的模块（只列清单，不要动代码）」
  → Claude 输出模块清单
  → 你审查并确认

第 2 步：「先抽离 UserService 模块到 services/UserService.ts」
  → Claude 执行
  → 你运行 typecheck 验证

第 3 步：「抽离 AuthMiddleware 到 middleware/auth.ts」
  → 重复验证

...
```

**效果**：
- 每步都可验证
- 出错时只需回滚一步
- 你始终掌控进度

### 原则 4：利用 Plan Mode

对于非平凡任务，让 Claude 先做计划。

**触发 Plan Mode**：
```
「我想重构文章详情页的 WebView 消息处理逻辑，
但不确定最佳方案。请先进入 Plan Mode，
分析现有代码，提出 2-3 种方案，列出优缺点。」
```

**Plan Mode 的价值**：
- 强迫 Claude 先思考再行动
- 你可以在实施前纠正方向
- 避免「边做边改」的混乱

## 第二部分：进阶技巧

### 技巧 1：使用「约束 + 自由度」模式

给 Claude 明确的约束，但在约束内给它自由发挥的空间。

**示例：重构函数**
```
「重构 calculateDiscount() 函数：

【约束】
- 保持函数签名不变（输入输出类型不变）
- 不引入新的依赖
- 性能不能比现在差

【自由度】
- 可以改内部实现逻辑
- 可以抽离 helper 函数
- 可以优化算法

【目标】
- 提高可读性（减少嵌套）
- 增加可测试性（纯函数优先）
」
```

**为什么有效**：
- 约束防止 Claude 「过度创新」
- 自由度让 Claude 发挥 AI 优势（找到你没想到的优化点）

### 技巧 2：提供「反例」

告诉 Claude 什么**不要做**，和告诉它做什么一样重要。

**示例：生成 API 文档**
```
「为 /api/posts 接口生成 OpenAPI 文档。

【要求】
- 包含所有查询参数（locale, category, tag, page, limit）
- 包含响应示例（成功 200 和失败 500）

【不要】
- 不要用 Swagger 2.0（用 OpenAPI 3.0）
- 不要生成 YAML（用 JSON）
- 不要包含内部字段（如 _internal_id）
」
```

### 技巧 3：「Show, Don't Tell」

与其描述你想要什么，不如**展示一个例子**。

**❌ 描述风格**
```
「把这个函数改成函数式风格，用 map/filter/reduce」
```

**✅ 展示例子**
```
「把这个函数改成类似下面的函数式风格：

// 参考例子
function processUsers(users) {
  return users
    .filter(u => u.active)
    .map(u => ({ id: u.id, name: u.name }))
    .reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
}

现在改写 processOrders() 函数，用同样的风格。」
```

**为什么有效**：
- 例子比描述更精确
- Claude 能直接模仿模式
- 减少歧义

### 技巧 4：迭代式细化

第一次 prompt 不需要完美。根据 Claude 的输出，逐步细化需求。

**第 1 轮**
```
用户：「写一个 React 组件显示用户列表」

Claude：[生成一个基础组件]

用户：「加上搜索功能」

Claude：[加搜索框]

用户：「搜索要支持模糊匹配，高亮匹配部分」

Claude：[实现高亮]

用户：「搜索结果为空时显示『未找到用户』」

Claude：[加空态]
```

**关键**：每轮只加一个需求，让 Claude 专注。

### 技巧 5：利用 Memory 系统

把重复的偏好写进 memory，避免每次都说。

**feedback.md**
```markdown
---
type: feedback
---

## 代码风格偏好

1. 用函数式组件，不用 class 组件
   **Why**: 团队统一用 hooks
   **How to apply**: 所有 React 组件都用函数式

2. 用 const 声明函数，不用 function 关键字
   **Why**: 保持一致性
   **How to apply**: `const foo = () => {}` 而非 `function foo() {}`

3. 导入顺序：React → 第三方库 → 本地模块
   **Why**: 可读性
   **How to apply**: 所有文件的 import 都按这个顺序

4. 不要在 commit message 里用 emoji
   **Why**: 团队规范
   **How to apply**: git commit 时不加 emoji
```

**效果**：Claude 会自动遵守这些规则，你不用每次都提醒。

## 第三部分：场景化案例

### 场景 1：调试神秘 Bug

**背景**：生产环境偶发 500 错误，本地无法复现。

**❌ 低效 Prompt**
```
「帮我找 bug」
```

**✅ 高效 Prompt**
```
「生产环境偶发 500 错误（约 1% 请求），错误日志：
  Error: Cannot read property 'id' of undefined
  at /api/posts/:slug (line 42)

本地无法复现。怀疑是竞态条件或边界情况。

请：
1. 读取 /api/posts/:slug 的代码（line 30-50）
2. 分析哪些情况下 line 42 的对象可能是 undefined
3. 提出 3 种可能的根因假设
4. 针对每种假设，建议如何验证（加日志 or 改代码）
」
```

**Claude 的输出**：
```
读取代码后，发现 line 42 是：
  const postId = post.id;

可能的根因：

1. 【假设 1】数据库查询返回 null
   - 原因：slug 不存在或已被删除
   - 验证：加日志 `if (!post) logger.warn('Post not found', { slug })`
   - 修复：提前返回 404

2. 【假设 2】缓存失效时的竞态
   - 原因：两个请求同时查缓存未命中，都去查 DB，其中一个拿到 null
   - 验证：加日志记录缓存命中率和并发请求
   - 修复：用分布式锁（Redis）

3. 【假设 3】序列化/反序列化问题
   - 原因：从 Redis 读出的 post 对象格式不对
   - 验证：加日志 `logger.debug('Post from cache', { post })`
   - 修复：检查 JSON.parse 逻辑

建议先加日志验证假设 1（最常见），如果不是再看假设 2。
```

**关键**：
- 提供错误日志和上下文
- 明确要求「分析 + 假设 + 验证方案」
- Claude 给出结构化的调试路径

### 场景 2：性能优化

**背景**：首页加载慢，需要优化。

**❌ 低效 Prompt**
```
「优化首页性能」
```

**✅ 高效 Prompt**
```
「首页加载慢（LCP 3.2s，目标 < 2s）。

当前瓶颈（Chrome DevTools 分析）：
1. API 请求 /api/posts 耗时 800ms
2. 渲染 20 个文章卡片耗时 600ms
3. 图片加载阻塞渲染（未懒加载）

请针对这三个瓶颈，分别提出优化方案：
- API 请求：考虑缓存、分页、字段裁剪
- 渲染：考虑虚拟滚动、memo、懒加载
- 图片：考虑 lazy loading、WebP、CDN

每个方案要说明：
- 预期提升（如「减少 200ms」）
- 实现难度（简单/中等/困难）
- 风险（如「可能影响 SEO」）
」
```

**Claude 的输出**：
```
## 方案 1：API 请求优化

### 1.1 客户端缓存（SWR）
- 预期提升：首次 800ms → 二次访问 50ms
- 实现难度：简单（用 useSWR hook）
- 风险：低（stale-while-revalidate 保证数据新鲜）

### 1.2 分页 + 预加载
- 预期提升：800ms → 300ms（只加载 10 篇）
- 实现难度：中等（需改 API 和前端）
- 风险：中（用户可能注意到「加载更多」）

### 1.3 字段裁剪
- 预期提升：800ms → 600ms（减少 payload）
- 实现难度：简单（API 加 fields 参数）
- 风险：低

## 方案 2：渲染优化

### 2.1 虚拟滚动
- 预期提升：600ms → 150ms（只渲染可见部分）
- 实现难度：中等（用 react-window）
- 风险：中（滚动体验可能不如原生）

### 2.2 React.memo + useMemo
- 预期提升：600ms → 450ms（避免重复渲染）
- 实现难度：简单
- 风险：低

## 方案 3：图片优化

### 3.1 Lazy loading
- 预期提升：阻塞 → 非阻塞（LCP 改善 500ms）
- 实现难度：简单（loading="lazy"）
- 风险：低

### 3.2 WebP + 响应式图片
- 预期提升：减少 40% 图片体积
- 实现难度：中等（需 CDN 支持）
- 风险：低（有 fallback）

## 推荐组合（快速见效）
1. 客户端缓存（SWR）—— 1 小时实现
2. React.memo —— 30 分钟实现
3. Lazy loading —— 15 分钟实现

预期总提升：LCP 3.2s → 1.8s（达标）
```

**关键**：
- 提供性能数据（不是「慢」，而是「3.2s」）
- 明确瓶颈（不是「整体慢」，而是「这三个点慢」）
- 要求结构化输出（方案 + 预期 + 难度 + 风险）

### 场景 3：代码审查

**背景**：同事提交了一个 PR，你想让 Claude 帮忙 review。

**❌ 低效 Prompt**
```
「review 这个 PR」
```

**✅ 高效 Prompt**
```
「review 这个 PR，重点关注：

1. 安全问题
   - SQL 注入
   - XSS
   - CSRF
   - 敏感信息泄露

2. 性能问题
   - N+1 查询
   - 内存泄漏
   - 阻塞操作

3. 可维护性
   - 代码重复
   - 命名不清晰
   - 缺少注释（复杂逻辑）

4. 测试覆盖
   - 是否有单元测试
   - 边界条件是否覆盖

对于每个问题，说明：
- 位置（文件 + 行号）
- 严重程度（Critical / Major / Minor）
- 修复建议
」
```

**Claude 的输出**：
```
## 安全问题

### [Critical] SQL 注入风险
**位置**: src/api/posts.ts:42
**代码**:
  const query = `SELECT * FROM posts WHERE slug = '${req.params.slug}'`;

**问题**: 直接拼接用户输入到 SQL
**修复**:
  const query = 'SELECT * FROM posts WHERE slug = ?';
  db.query(query, [req.params.slug]);

### [Major] XSS 风险
**位置**: src/components/PostContent.tsx:28
**代码**:
  <div dangerouslySetInnerHTML={{ __html: post.content }} />

**问题**: 未 sanitize HTML
**修复**: 用 DOMPurify.sanitize(post.content)

## 性能问题

### [Major] N+1 查询
**位置**: src/api/posts.ts:55-60
**代码**:
  for (const post of posts) {
    post.author = await db.query('SELECT * FROM users WHERE id = ?', [post.authorId]);
  }

**问题**: 循环里查数据库
**修复**: 用 JOIN 或 DataLoader

## 可维护性

### [Minor] 代码重复
**位置**: src/utils/format.ts:10-20 和 src/utils/date.ts:15-25
**问题**: formatDate 逻辑重复
**修复**: 抽成共享函数

## 测试覆盖

### [Major] 缺少边界条件测试
**位置**: tests/api/posts.test.ts
**问题**: 只测了正常情况，没测：
  - slug 不存在 → 应返回 404
  - slug 包含特殊字符 → 应正确转义
  - 并发请求 → 应不冲突

**建议**: 加这三个测试用例
```

**关键**：
- 明确 review 重点（不是「看看有没有问题」，而是「重点看这 4 类问题」）
- 要求结构化输出（位置 + 严重程度 + 修复建议）
- Claude 给出可操作的建议

## 第四部分：常见错误

### 错误 1：过度依赖 AI

**症状**：不假思索地接受 Claude 的建议

**后果**：
- 引入不必要的复杂度
- 代码风格不一致
- 潜在 bug

**解决**：
- 始终审查 AI 生成的代码
- 问自己「为什么这样做」
- 不理解的代码不要合并

### 错误 2：一次性任务过大

**症状**：「重构整个项目」「实现完整的用户系统」

**后果**：
- Claude 理解错需求
- 中途出错难以回滚
- 浪费大量 token

**解决**：
- 拆成小任务（每个 < 30 分钟）
- 每步验证后再继续
- 用 Plan Mode 先规划

### 错误 3：上下文不足

**症状**：「加一个功能」「修这个 bug」

**后果**：
- Claude 猜测你的意图（经常猜错）
- 生成的代码不符合项目规范
- 需要多次迭代

**解决**：
- 提供技术栈、现有代码位置、约束条件
- 展示相关代码片段
- 说明预期输出

### 错误 4：忽略 Memory 系统

**症状**：每次都重复说同样的偏好

**后果**：
- 浪费时间
- Claude 可能忘记之前的反馈

**解决**：
- 把重复的偏好写进 feedback.md
- 把项目背景写进 project.md
- 定期更新 memory

## 第五部分：进阶话题

### 话题 1：多轮对话策略

复杂任务需要多轮对话。如何保持上下文连贯？

**策略 1：显式引用**
```
「在上一轮你建议用 Redis 做缓存。
现在实现这个方案，参考 /config/redis.ts 的配置。」
```

**策略 2：总结中间结果**
```
「目前我们已经：
1. 抽离了 UserService
2. 加了单元测试
3. 更新了 API 文档

下一步：实现权限控制（参考 /middleware/auth.ts）」
```

**策略 3：用 Plan Mode 做检查点**
```
「我们做了 5 个改动。请进入 Plan Mode，
总结当前状态，列出剩余任务。」
```

### 话题 2：处理 Claude 的「幻觉」

Claude 有时会「编造」不存在的 API 或函数。

**识别幻觉**：
- 函数名看起来「太完美」（如 `autoFixAllBugs()`）
- 引用了你没见过的库
- 参数和文档不符

**应对策略**：
```
「你提到的 `useAutoSave()` hook 在我们项目里不存在。
请用现有的 `useDebouncedCallback()` 实现自动保存。」
```

**预防幻觉**：
- 明确说「只用现有的函数/库」
- 提供可用工具的清单
- 要求 Claude 先检查再使用

### 话题 3：成本优化

Claude Code 按 token 计费。如何降低成本？

**技巧 1：用 Haiku 做简单任务**
```
「用 Haiku 模型：格式化这段代码（只改格式，不改逻辑）」
```

**技巧 2：避免重复读取大文件**
```
「我已经把 config.ts 的内容贴在下面了，不用再读取：
[贴代码]

现在基于这个配置，生成...」
```

**技巧 3：用 Memory 减少重复说明**
- 把项目背景写进 project.md
- 把代码规范写进 feedback.md
- Claude 会自动加载，不用每次都说

## 结语

Prompt Engineering 的本质是**清晰沟通**：

1. **明确目标**：说清楚你要什么
2. **提供上下文**：给足够的信息
3. **分步执行**：复杂任务拆小步
4. **迭代细化**：根据输出调整需求
5. **利用工具**：Plan Mode、Memory、子代理

**最后的建议**：

- 把 Claude 当成「初级工程师」，不是「魔法黑盒」
- 给它明确的任务、及时的反馈、合理的权限
- 审查它的输出，不要盲目信任
- 记录有效的 prompt 模式，形成团队知识库

**Prompt Engineering 是一项可以练习的技能**。多用、多总结、多分享，你会越来越擅长「驾驭」AI。

---

**延伸阅读**
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [OpenAI Best Practices for Prompt Engineering](https://platform.openai.com/docs/guides/prompt-engineering)
- [Prompt Engineering for Developers (DeepLearning.AI)](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)

**作者简介**
全栈工程师，Claude Code 重度用户。过去一年用 Claude Code 完成了 3 个大型重构项目，总结出这套 prompt 方法论。目前在团队内部开设「AI 协作」工作坊，帮助同事提升 AI 使用效率。
