---
title: "AI 代码审查实战：用 Claude Code 提升代码质量"
description: "探索如何将 AI 集成到代码审查流程，提高审查效率和发现问题的能力"
date: 2026-05-12
categories: ["Code Quality"]
tags: ["Code Review", "Claude Code", "Quality Assurance", "Best Practices"]
series: "AI 开发工具系列"
---

# AI 代码审查实战：用 Claude Code 提升代码质量

## 引言

代码审查（Code Review）是保证代码质量的关键环节，但也是最耗时的环节之一。一个典型的 PR 审查流程：

1. 审查者花 20-30 分钟理解改动
2. 发现 5-10 个问题（格式、命名、逻辑）
3. 作者修复，重新提交
4. 审查者再花 10-15 分钟复查
5. 重复 2-3 轮

**总耗时**：1-2 小时/PR，对于大型 PR 可能更长。

Claude Code 可以承担「初审」工作，让人类审查者专注于架构和业务逻辑。本文分享我们团队的实践经验。

## 第一部分：AI 审查的优势与局限

### AI 擅长什么

✅ **机械性检查**
- 代码风格（缩进、命名、注释）
- 类型错误（TypeScript、Python type hints）
- 常见反模式（N+1 查询、内存泄漏）
- 安全漏洞（SQL 注入、XSS、硬编码密钥）

✅ **上下文理解**
- 跨文件影响分析
- API 兼容性检查
- 测试覆盖度评估

✅ **知识库查询**
- 对比最佳实践（OWASP、Google Style Guide）
- 检查是否符合团队规范

### AI 不擅长什么

❌ **业务逻辑判断**
- 这个需求是否合理？
- 这个实现是否符合产品意图？
- 边界条件是否考虑周全？

❌ **架构决策**
- 这个抽象是否合理？
- 是否过度设计？
- 技术选型是否恰当？

❌ **团队协作**
- 这个改动是否需要通知其他团队？
- 是否与其他 PR 冲突？

**结论**：AI 做「守门员」，人类做「教练」。

## 第二部分：集成 AI 审查到工作流

### 方案 1：Pre-commit Hook（本地审查）

在提交前自动运行 AI 审查。

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "🤖 Running AI code review..."

# 获取 staged 文件
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|py)$')

if [ -z "$STAGED_FILES" ]; then
  echo "✅ No code files to review"
  exit 0
fi

# 调用 Claude Code API
REVIEW_RESULT=$(claude-code review --files "$STAGED_FILES" --format json)

# 解析结果
ISSUES=$(echo "$REVIEW_RESULT" | jq '.issues | length')

if [ "$ISSUES" -gt 0 ]; then
  echo "❌ Found $ISSUES issues:"
  echo "$REVIEW_RESULT" | jq -r '.issues[] | "  - [\(.severity)] \(.file):\(.line) - \(.message)"'
  echo ""
  echo "Fix these issues or use 'git commit --no-verify' to skip"
  exit 1
fi

echo "✅ AI review passed"
exit 0
```

**优点**：
- 问题在本地就被发现，不浪费 CI 时间
- 开发者立即得到反馈

**缺点**：
- 可能被 `--no-verify` 绕过
- 增加 commit 延迟（2-5 秒）

### 方案 2：GitHub Actions（CI 审查）

在 PR 创建时自动审查。

```yaml
# .github/workflows/ai-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 获取完整历史

      - name: Get changed files
        id: changed-files
        run: |
          echo "files=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | tr '\n' ' ')" >> $GITHUB_OUTPUT

      - name: Run AI Review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx claude-code review \
            --files "${{ steps.changed-files.outputs.files }}" \
            --output review.md

      - name: Post Review Comment
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('review.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🤖 AI Code Review\n\n${review}`
            });

      - name: Check for Critical Issues
        run: |
          CRITICAL=$(grep -c '\[Critical\]' review.md || true)
          if [ "$CRITICAL" -gt 0 ]; then
            echo "❌ Found $CRITICAL critical issues"
            exit 1
          fi
```

**优点**：
- 无法绕过（CI 必须通过）
- 审查结果自动发布到 PR

**缺点**：
- 反馈延迟（需要等 CI 运行）
- 消耗 CI 资源

### 方案 3：混合模式（推荐）

- **Pre-commit**：快速检查（格式、类型错误）
- **CI**：深度审查（安全、性能、架构）
- **人工**：业务逻辑、架构决策

## 第三部分：审查清单设计

### 基础清单（所有 PR）

```markdown
## 代码风格
- [ ] 命名符合规范（camelCase / snake_case）
- [ ] 无多余空行或缩进
- [ ] 注释清晰（复杂逻辑必须有注释）

## 类型安全
- [ ] 无 TypeScript `any` 类型（除非必要）
- [ ] 函数参数和返回值都有类型标注
- [ ] 无类型断言（`as`）滥用

## 错误处理
- [ ] 所有异步操作都有 try-catch
- [ ] 错误信息包含足够上下文
- [ ] 不吞掉错误（silent catch）

## 测试
- [ ] 新功能有单元测试
- [ ] 边界条件有覆盖
- [ ] 测试命名清晰（描述测试场景）
```

### 安全清单（涉及用户输入/数据库）

```markdown
## 输入验证
- [ ] 所有用户输入都经过验证
- [ ] 使用白名单而非黑名单
- [ ] 文件上传有大小和类型限制

## SQL 安全
- [ ] 使用参数化查询（不拼接 SQL）
- [ ] 敏感操作有权限检查
- [ ] 数据库连接使用最小权限账号

## XSS 防护
- [ ] 用户内容经过 sanitize
- [ ] 不使用 dangerouslySetInnerHTML（除非必要）
- [ ] CSP 头正确配置

## 认证授权
- [ ] 敏感接口需要认证
- [ ] 权限检查在服务端（不依赖前端）
- [ ] Token 有过期时间
```

### 性能清单（高流量接口）

```markdown
## 数据库
- [ ] 无 N+1 查询
- [ ] 查询有索引支持
- [ ] 分页查询有 limit

## 缓存
- [ ] 热点数据有缓存
- [ ] 缓存有 TTL
- [ ] 缓存失效策略合理

## 资源管理
- [ ] 无内存泄漏（事件监听器、定时器）
- [ ] 大文件流式处理（不一次性加载）
- [ ] 连接池正确配置
```

## 第四部分：实战案例

### 案例 1：发现 SQL 注入

**PR 改动**：
```typescript
// src/api/users.ts
app.get('/users/search', (req, res) => {
  const keyword = req.query.keyword;
  const sql = `SELECT * FROM users WHERE name LIKE '%${keyword}%'`;
  db.query(sql, (err, results) => {
    res.json(results);
  });
});
```

**AI 审查输出**：
```markdown
## 🚨 Critical Issues

### [Critical] SQL Injection Vulnerability
**File**: src/api/users.ts:3
**Issue**: User input `keyword` is directly interpolated into SQL query
**Attack vector**: `keyword='; DROP TABLE users; --`
**Fix**:
\`\`\`typescript
const sql = 'SELECT * FROM users WHERE name LIKE ?';
db.query(sql, [`%${keyword}%`], (err, results) => {
  res.json(results);
});
\`\`\`
**Reference**: [OWASP SQL Injection](https://owasp.org/www-community/attacks/SQL_Injection)
```

**人工审查补充**：
- 还需要加输入长度限制（防止 DoS）
- 考虑用全文搜索（Elasticsearch）替代 LIKE（性能更好）

### 案例 2：发现性能问题

**PR 改动**：
```typescript
// src/api/posts.ts
app.get('/posts', async (req, res) => {
  const posts = await db.query('SELECT * FROM posts');

  // 为每篇文章加载作者信息
  for (const post of posts) {
    post.author = await db.query('SELECT * FROM users WHERE id = ?', [post.author_id]);
  }

  res.json(posts);
});
```

**AI 审查输出**：
```markdown
## ⚠️ Performance Issues

### [Major] N+1 Query Problem
**File**: src/api/posts.ts:6-8
**Issue**: Loading author for each post in a loop causes N+1 queries
**Impact**: For 100 posts, this makes 101 database queries (1 for posts + 100 for authors)
**Fix Option 1** (JOIN):
\`\`\`typescript
const posts = await db.query(`
  SELECT posts.*, users.name as author_name, users.email as author_email
  FROM posts
  LEFT JOIN users ON posts.author_id = users.id
`);
\`\`\`
**Fix Option 2** (DataLoader):
\`\`\`typescript
const posts = await db.query('SELECT * FROM posts');
const authorIds = posts.map(p => p.author_id);
const authors = await db.query('SELECT * FROM users WHERE id IN (?)', [authorIds]);
const authorMap = Object.fromEntries(authors.map(a => [a.id, a]));
posts.forEach(p => p.author = authorMap[p.author_id]);
\`\`\`
**Recommendation**: Use Option 1 (simpler), unless you need DataLoader for caching
```

**人工审查补充**：
- 还需要加分页（`LIMIT` / `OFFSET`）
- 考虑加缓存（Redis）

### 案例 3：发现测试覆盖不足

**PR 改动**：
```typescript
// src/utils/discount.ts
export function calculateDiscount(price: number, couponCode: string): number {
  if (couponCode === 'SAVE10') {
    return price * 0.9;
  }
  if (couponCode === 'SAVE20') {
    return price * 0.8;
  }
  return price;
}

// tests/utils/discount.test.ts
test('applies SAVE10 coupon', () => {
  expect(calculateDiscount(100, 'SAVE10')).toBe(90);
});
```

**AI 审查输出**：
```markdown
## ⚠️ Test Coverage Issues

### [Minor] Missing Edge Case Tests
**File**: tests/utils/discount.test.ts
**Missing scenarios**:
1. Invalid coupon code → should return original price
2. Negative price → should handle gracefully (throw error or return 0?)
3. Zero price → should return 0
4. Very large price (> Number.MAX_SAFE_INTEGER) → should handle overflow
5. Case sensitivity ('save10' vs 'SAVE10') → should clarify behavior

**Suggested tests**:
\`\`\`typescript
test('returns original price for invalid coupon', () => {
  expect(calculateDiscount(100, 'INVALID')).toBe(100);
});

test('handles negative price', () => {
  expect(() => calculateDiscount(-100, 'SAVE10')).toThrow('Price must be positive');
});

test('handles zero price', () => {
  expect(calculateDiscount(0, 'SAVE10')).toBe(0);
});

test('coupon codes are case-sensitive', () => {
  expect(calculateDiscount(100, 'save10')).toBe(100);  // Not applied
});
\`\`\`
```

**人工审查补充**：
- 需要明确产品需求：优惠券是否区分大小写？
- 负数价格在业务上是否可能出现？

## 第五部分：最佳实践

### 1. 分层审查

**第一层（AI 自动）**：格式、类型、常见错误
**第二层（人工快速）**：逻辑正确性、测试覆盖
**第三层（人工深度）**：架构、性能、安全

### 2. 审查模板

为不同类型的 PR 准备模板：

**新功能 PR**：
```markdown
## AI Review Checklist
- [ ] 代码风格
- [ ] 类型安全
- [ ] 错误处理
- [ ] 单元测试
- [ ] 集成测试
- [ ] 文档更新

## Human Review Focus
- [ ] 需求理解是否正确
- [ ] 架构设计是否合理
- [ ] 是否有更简单的实现
```

**Bug 修复 PR**：
```markdown
## AI Review Checklist
- [ ] 修复是否正确（不引入新 bug）
- [ ] 是否有回归测试
- [ ] 错误日志是否完善

## Human Review Focus
- [ ] 根因分析是否准确
- [ ] 是否需要修复其他类似问题
- [ ] 是否需要通知用户
```

### 3. 持续改进

每月回顾：
- AI 发现了哪些问题？
- 哪些问题 AI 没发现？
- 如何改进审查清单？

**示例改进**：
```markdown
## 2026-04 Review Retrospective

### AI 发现的问题（Top 3）
1. SQL 注入（5 次）
2. N+1 查询（8 次）
3. 缺少错误处理（12 次）

### AI 漏掉的问题（Top 3）
1. 业务逻辑错误（「优惠叠加」规则理解错误）
2. 并发问题（竞态条件）
3. 用户体验问题（加载状态缺失）

### 改进措施
- [ ] 在审查清单中加「并发安全」检查
- [ ] 训练团队识别业务逻辑错误
- [ ] 加 UX checklist（loading / error / empty state）
```

## 结语

AI 代码审查不是替代人工审查，而是**提升审查效率**：

- AI 处理机械性检查（节省 50% 审查时间）
- 人类专注于高价值审查（架构、业务逻辑）
- 两者结合，代码质量更高

**实施建议**：
1. 从简单开始（pre-commit hook 检查格式）
2. 逐步增加检查项（安全、性能）
3. 持续优化清单（根据实际问题调整）
4. 培训团队（如何解读 AI 审查结果）

**最后提醒**：AI 审查结果不是「圣旨」，而是「建议」。人类审查者有最终决定权。

---

**延伸阅读**
- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/)
- [Effective Code Reviews](https://www.oreilly.com/library/view/effective-code-reviews/9781098146894/)
- [OWASP Code Review Guide](https://owasp.org/www-project-code-review-guide/)

**作者简介**
技术负责人，管理 15 人团队。引入 AI 代码审查后，PR 平均审查时间从 45 分钟降到 20 分钟，代码质量问题减少 40%。
