# 经验教训

## 2026-03-12: 积分系统修改与测试状态隔离

### 问题1: Playwright 测试状态污染

**现象**：测试单独运行时通过，但一起运行时失败。原因是测试之间共享了 localStorage 状态。

**解决方案**：
1. 每个测试开始时先执行 `await page.evaluate(() => localStorage.clear())` 再 `await page.reload()`
2. 在 `beforeEach` 中先导航到 `about:blank` 再导航到目标页面
3. 使用 `await context.clearCookies()` 清理 cookies

**代码示例**：
```typescript
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies();
  await page.goto('about:blank');
  await page.goto(httpUrl);
  // ... 等待页面加载
});

test('my test', async ({ page }) => {
  // 每个测试内部也主动清理
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  // ... 测试逻辑
});
```

### 问题2: Git commit message 格式

**现象**：`git commit -m` 后面的 message 包含换行符会导致 shell 解析错误。

**解决方案**：
- 使用单行 message
- 或者用 `git commit` 不带 `-m` 打开编辑器
- 或者使用 HEREDOC 格式（但要注意转义）

**错误示例**：
```bash
git commit -m "第一行
第二行"  # 会报错
```

**正确示例**：
```bash
git commit -m "第一行：描述内容"
# 或
git commit  # 打开编辑器
```

### 问题3: 修改核心逻辑后测试期望值需同步更新

**现象**：修改积分逻辑后，现有测试（如 level-unlock 测试）的积分期望值也需要更新。

**教训**：修改核心逻辑时，要检查所有相关测试是否需要同步更新期望值。

---

## 规则总结

1. **测试隔离**：每个 Playwright 测试都要确保完全独立的状态，不依赖其他测试的执行结果
2. **Git commit**：commit message 保持单行，或使用编辑器模式
3. **修改影响范围**：修改核心逻辑时，检查所有相关测试的期望值
