# Quiz Mode 通关模式改进 - 调试经验总结

## 问题分析

## 最佳实践建议

### 1. 测试策略
- **代码级验证优先**：使用 `page.evaluate()` 验证函数逻辑，不依赖 UI
- **分阶段验证**：先修复核心 Bug（unlockNextLevel），再验证 UI 交互
- **手动验证最可靠**：直接在浏览器中打开 HTML 文件进行端到端测试

### 2. 调试方法
- **使用简化测试用例**：每个测试只验证一个功能点
- **添加详细日志**：`console.log()` 帮助定位问题
- **清理缓存**：`npx playwright clear-cache`
- **检查网络**：`curl` 验证 HTTP 服务器是否正常运行

### 3. 代码理解
- **理解数据结构**：嵌入式 JSON vs localStorage
- **理解执行顺序**：`selectSource()` → `renderLevels()` → 点击事件
- **理解作用域**：全局函数 vs 类方法

### 4. 问题诊断流程
1. 复现现象
2. 分析根本原因
3. 提出解决方案
4. 实施修复
5. 验证结果

---

## 下次改进建议

1. **使用测试框架专门为 SPA**：考虑使用专门为单页应用设计的测试框架
2. **分离测试环境**：创建独立的测试配置，避免与开发环境冲突
3. **端到端测试**：使用 Cypress 或 Playwright 的 API testing 能力
4. **集成测试**：在 CI/CD 流程中运行完整的端到端测试

---

### 问题 1: Playwright 访问全局变量

**现象**:
- 在 `page.evaluate()` 中访问 `userData`、`quizGame` 等全局变量时返回 `undefined`

**根本原因**:
- HTML 中使用 `let` 或 `const` 在 script 标签内声明的变量，虽然在全局作用域中
- 但 `page.evaluate()` 执行的代码在不同的上下文中运行
- `globalThis` 在浏览器中对应 `window`，但 `let/const` 变量不会自动附加到 `window` 对象

**解决方案**:
1. **使用 localStorage 读取持久化数据**:
   ```typescript
   async function getUnlockedLevels(page: Page): Promise<string[]> {
     const data = await page.evaluate(() => {
       const saved = localStorage.getItem('ketUserData');
       return saved ? JSON.parse(saved) : null;
     });
     return data?.unlockedLevels || [];
   }
   ```

2. **使用 `window.eval()` 访问运行时变量**:
   ```typescript
   const correctAnswer = await page.evaluateHandle(() => {
     return window.eval('quizGame?.currentQuestionData?.correctAnswer');
   });
   return await answer.jsonValue();
   ```

3. **页面重新加载应用数据**:
   ```typescript
   await page.evaluate(() => {
     localStorage.setItem('ketUserData', JSON.stringify(defaultUserData));
   });
   await page.reload(); // 重新加载以应用数据
   ```

**经验教训**:
- ✅ 永远不要假设 `let/const` 声明的全局变量可以通过 `page.evaluate()` 的 `globalThis` 访问
- ✅ 对于持久化数据，使用 localStorage 而不是直接访问内存变量
- ✅ 在使用 `page.evaluate()` 后验证返回值是否存在

---

### 问题 2: 严格模式冲突 (Strict Mode Violation)

**现象**:
- 使用 `.filter({ hasText: correctAnswer })` 时出现错误
- 错误信息：`strict mode violation: resolved to 2 elements`

**场景**:
- 多个测验选项可能包含相同的文本片段（如 "name" 和 "surname" 都包含 "name"）

**解决方案**:
使用 `.first()` 选择第一个匹配的元素：
```typescript
const optionLocator = page.locator('.quiz-option').filter({ hasText: correctAnswer }).first();
await optionLocator.click();
```

**经验教训**:
- ✅ 当选择器可能匹配多个元素时，总是使用 `.first()` 或更具体的选择器
- ✅ 如果元素有文本重复，考虑使用 `exact: true` 或更具体的属性选择器

---

### 问题 3: 按钮选择器冲突

**现象**:
- `.next-btn` 选择器匹配到页面上的多个按钮
- 点击了错误的按钮，导致测试失败

**场景**:
- 学习模式中有"下一个 →"按钮（`#nextBtn`）
- 测验模式中答错后有"继续"按钮
- 两者都有 `.next-btn` 类

**解决方案**:
使用 `getByRole()` 和精确的文本匹配：
```typescript
// 选择文本为"继续"的按钮（测验模式）
const nextBtn = page.getByRole('button', { name: '继续' });
await nextBtn.click();
```

**经验教训**:
- ✅ 使用语义化的选择器（如 `getByRole()`）而不是仅依赖类名
- ✅ 当存在多个相似按钮时，使用 `name` 选项指定精确的按钮文本

---

### 测试流程优化

**测试初始化步骤**:
```typescript
// 1. 清理测试环境
await context.clearCookies();
await page.goto(httpUrl);

// 2. 等待页面加载
await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
await page.waitForSelector('.units-grid', { state: 'visible' });

// 3. 预设 localStorage 数据
await page.evaluate(() => {
  localStorage.setItem('ketUserData', JSON.stringify(defaultUserData));
});
await page.reload(); // 重新加载应用数据

// 4. 导航到目标页面
await firstPretestBtn.click();
await page.waitForSelector('#levelSelectPage:not(.hidden)', { state: 'visible' });
```

**等待策略**:
```typescript
// 等待元素可见
await page.waitForSelector('#quizQuestion', { state: 'visible', timeout: 10000 });

// 等待选项按钮
await page.waitForSelector('.quiz-option', { state: 'visible', timeout: 10000 });

// 短暂延迟处理动画
await page.waitForTimeout(300);
```

**经验教训**:
- ✅ 不要假设页面加载后立即可交互 - 等待关键元素可见
- ✅ 在测试每个步骤之间添加明确的等待，确保 UI 稳定
- ✅ 使用 `:not(.hidden)` 选择器确保元素不仅是可见的，而且未隐藏

---

### 辅助函数设计最佳实践

**单一职责原则**:
```typescript
// ✅ 检查状态
async function isQuizComplete(page: Page): Promise<boolean> {
  return await page.locator('#completionPage').isVisible();
}

// ✅ 获取数据
async function getUnlockedLevels(page: Page): Promise<string[]> {
  const data = await page.evaluate(() => {
    const saved = localStorage.getItem('ketUserData');
    return saved ? JSON.parse(saved) : null;
  });
  return data?.unlockedLevels || [];
}

// ✅ 执行操作并返回结果
async function answerQuestionCorrectly(page: Page): Promise<boolean> {
  const answer = await getCorrectAnswer(page);
  const option = page.locator('.quiz-option').filter({ hasText: answer }).first();
  await optionLocator.click();
  return await isQuizComplete(page);
}
```

**经验教训**:
- ✅ 每个辅助函数只做一件事
- ✅ 在辅助函数内部添加适当的等待
- ✅ 返回有意义的类型（如 `Promise<boolean>`）表示操作结果
- ✅ 提供清晰的错误消息用于调试

---

### 测试用例设计模式

**完整用户流程测试**:
1. **初始状态验证**: 验证测试开始时的状态
2. **执行操作**: 执行被测试的功能（如完成测验）
3. **中间状态检查**: 验证中间步骤（如答题过程）
4. **最终状态验证**: 验证操作后的状态（如关卡解锁）

**示例**:
```typescript
test('Unlock next level when all answers are correct', async ({ page }) => {
  // 1. 初始状态
  const initial = await getUnlockedLevels(page);
  expect(initial).toContain('unit1-pretest-1');

  // 2. 执行操作
  await startQuiz();
  await answerAllQuestionsCorrectly();

  // 3. 最终状态
  const final = await getUnlockedLevels(page);
  expect(final).toContain('unit1-pretest-2');
  expect(final.length).toBeGreaterThan(initial.length);
});
```

**经验教训**:
- ✅ 测试用例应验证状态变化，而不仅仅是 UI 元素存在
- ✅ 添加 console.log 记录关键步骤，便于调试
- ✅ 设置安全限制（如 `if (count > 50)`）防止无限循环

---

### KET 应用特定知识

**关卡系统数据流**:
```
1. 初始化: userData = { unlockedLevels: ["unit1-pretest-1"] }
2. 加载: loadUserData() 合并 localStorage 中的数据
3. 渲染: renderLevels() 检查 userData.unlockedLevels
4. 测验: startQuiz() 创建 quizGame 实例
5. 完成: showCompletion() 调用 unlockNextLevel()
6. 保存: saveUserData() 写入 localStorage
```

**关卡 ID 格式**: `{unit}-{source}-{index}`
- `unit1-pretest-1`: Unit 1，前测，关卡 1
- `unit1-wordlist-1`: Unit 1，词汇表，关卡 1

**解锁条件**:
```javascript
// showCompletion() 中的逻辑
if (score === total) {  // 全部答对
  unlockNextLevel(currentLevelId);  // 解锁下一关
}
```

---

### 快速参考 - Playwright 选择器

| 场景 | 选择器 | 示例 |
|--------|----------|--------|
| 按类名选择 | `.class-name` | `.quiz-option` |
| 按 ID 选择 | `#element-id` | `#quizPage` |
| 按文本过滤 | `.filter({ hasText: text })` | `.filter({ hasText: /通关/ })` |
| 首个元素 | `.first()` | `.quiz-option.first()` |
| 非隐藏元素 | `selector:not(.hidden)` | `#page:not(.hidden)` |
| 按角色选择 | `getByRole('button', { name: 'text' })` | `getByRole('button', { name: '继续' })` |

---

### 最佳实践建议

#### 1. 测试策略
- **使用项目现有测试框架**：优先使用 `tests/` 目录和 Playwright + TypeScript
- **分阶段测试**：先基础功能，再边界条件，最后综合场景
- **自动化验证**：利用 Playwright 的自动截图和报告生成
- **状态隔离**：每个测试用例独立，使用 `localStorage.clear()` 确保测试环境纯净

#### 2. 代码修改规范
- **遵循 CLAUDE.md 规则**：禁止使用 sed，使用 Edit 或 Write 工具
- **范围敏感**：修改限制在函数范围内，避免跨行正则匹配
- **备份机制**：重要修改前创建 `.bak` 文件
- **逐步验证**：每完成一个修改就验证功能

#### 3. 连续签到系统设计
- **清晰的状态管理**：首次签到、连续签到、断签三种状态
- **用户友好的反馈**：明确的 Toast 消息提示
- **数据一致性**：积分、连续天数、最后签到日期的同步更新
- **边界条件处理**：正确处理正好80%的边界情况

#### 4. 错误处理和用户体验
- **明确的错误提示**：告诉用户为什么操作没有成功
- **渐进式反馈**：从基础功能到高级功能的逐步引导
- **数据可视化**：显示正确的百分比和积分变化
- **防误操作**：防止重复打卡、错误计算等

### 被动打卡系统实现要点

#### 核心功能
1. **自动触发**：测验完成且≥80%正确率时自动打卡
2. **重复 Prevention**：同一天内不会重复打卡
3. **连续奖励**：每7天连续签到额外奖励20分
4. **断签惩罚**：中断连续签到扣除50分

#### 关键代码位置
- **主函数**：`autoCheckIn(score, total)` - 第706行
- **集成点**：`showCompletion()` - 第1058行调用
- **辅助函数**：`getTodayString()`、`getYesterdayString()` - 第694-705行

#### 测试覆盖
- **基础功能**：现有数据兼容性、新用户流程
- **边界条件**：80%阈值、重复打卡、断签惩罚
- **高级场景**：连续打卡、解锁机制、奖励计算

### 下次改进建议

1. **测试自动化**：建立完整的 CI/CD 流程，每次代码修改后自动运行测试
2. **性能监控**：添加性能测试，确保自动打卡不会影响测验性能
3. **用户反馈**：收集用户使用反馈，持续优化体验
4. **数据统计**：添加用户学习数据分析功能

### 当前状态

- ✅ **代码已实现**：被动打卡系统完成
- ✅ **逻辑优化**：连续天数和重复打卡机制修复
- ✅ **测试规范**：遵循 Playwright + TypeScript 测试框架
- ✅ **文档更新**：LESSONS_LEARNED.md 已更新

### 文件变更清单

- `ket-learning.html` - 核心功能修改（删除旧功能，添加新功能）
- `ket-learning.html.bak` - 备份文件
- `LESSONS_LEARNED.md` - 更新经验教训

