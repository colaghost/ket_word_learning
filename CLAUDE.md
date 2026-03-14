# CLAUDE.md

## Workflow Orchestration

### 1. Plan Node Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One tack per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.


## 项目概览

这是一个 KET (Key English Test) 单词学习网页应用，采用多啦A梦主题设计，包含学习模式、闯关测验和积分系统。

---

## 文件结构

ket-learning.html 是一个单文件 HTML 应用，包含：
1. **HTML 结构** (第 1-669 行)
2. **JavaScript 代码** (第 670-1179 行)

---

## 主要功能模块

### 1. 核心状态管理

| 变量 | 用途 |
|------|------|
| `levelData` | 存储所有关卡数据的巨大对象 |
| `userData` | 用户进度数据（积分、连续打卡天数、解锁关卡等） |
| `levelIdMap` | 关卡 ID 到关卡信息的映射 |
| `currentUnitSource` | 当前选择的单元源（如 `unit1-pretest`） |
| `currentLevelId` | 当前关卡 ID |
| `studyMode` | 学习模式状态 |
| `quizGame` | 测验游戏实例 |

### 2. 页面导航

使用 class `.hidden` 控制页面切换：
- `homePage` - 首页（显示所有单元）
- `levelSelectPage` - 关卡选择页面
- `studyPage` - 学习模式页面
- `quizPage` - 测验模式页面
- `completionPage` - 完成页面

### 3. 单元和关卡系统

```
Unit 1
├── 前测 (unit1-pretest)
│   ├── 关卡 1
│   ├── 关卡 2
│   └── ...
└── 词汇表 (unit1-wordlist)
    ├── 关卡 1
    ├── 关卡 2
    └── ...
```

关卡状态：
- **锁定** - 🔒 未解锁
- **解锁** - 🔓 已解锁
- **完成** - ✅ 已完成

### 4. 学习模式

| 函数 | 功能 |
|------|------|
| `startStudy(levelId)` | 启动学习模式 |
| `renderStudyWord()` | 渲染当前单词（显示单词、词性、音标、中文含义、例句） |
| `prevWord()` / `nextWord()` | 切换单词 |
| `speakCurrentWord()` | 朗读单词（使用 Web Speech API） |

### 5. 测验模式 (QuizGame 类)

```javascript
class QuizGame {
    // 问题类型：
    // - word-to-chinese: 英文 → 中文选择
    // - chinese-to-word: 中文 → 英文选择

    generateQuestion()  // 生成问题和选项
    checkAnswer()       // 检查答案
    getProgress()       // 获取进度
    isComplete()        // 判断是否完成
}
```

### 6. 积分与成就系统

| 功能 | 规则 |
|------|------|
| 每日打卡 | +10 积分 + 连续打卡奖励（每7天额外+20） |
| 测验得分 | 根据正确率获得积分（最高+50） |
| 解锁关卡 | 全对时自动解锁下一关，额外+20积分 |

### 7. 本地存储

使用 `localStorage` 持久化用户数据：
- 积分
- 连续打卡天数
- 已解锁关卡列表
- 已完成关卡列表

### 8. 视觉效果

- 多啦A梦主题配色（蓝色系）
- 卡片悬停动画
- 烟花效果（测验全对时）
- Toast 消息提示
- 渐变背景和阴影

---

## 关键代码位置

| 功能 | 文件位置 |
|------|----------|
| 数据结构定义 | 第 672-675 行 |
| 初始化函数 `init()` | 第 703-732 行 |
| 打卡功能 `checkIn()` | 第 765-778 行 |
| 渲染单元 `renderUnits()` | 第 781-807 行 |
| 渲染关卡 `renderLevels()` | 第 820-851 行 |
| 学习模式 | 第 872-925 行 |
| QuizGame 类 | 第 928-1000 行 |
| 完成页面 `showCompletion()` | 第 1073-1103 行 |
| 语音播放 `speakWord()` | 第 1129-1138 行 |
| 烟花效果 `createFireworks()` | 第 1158-1173 行 |

---

## 学习数据结构示例

每个单词数据包含：
```javascript
{
    "单词": "apple",
    "词性": "n.",
    "音标": "/ˈæpl/",
    "中文含义": "苹果",
    "例句": "I like to eat apples."
}
```

关卡数据包含：
- `id`: 关卡唯一标识符
- `words`: 单词数组
- `unit`: 所属单元
- `source`: 数据源类型 (pretest/wordlist)
- `index`: 关卡索引

---

## 用户数据结构

```javascript
userData = {
    points: 0,              // 积分
    streak: 0,              // 连续打卡天数
    lastCheckIn: null,      // 上次打卡日期
    unlockedLevels: [],    // 已解锁关卡
    completedLevels: []     // 已完成关卡
}
```

---

## 技术栈

- **前端框架**: 无（原生 JavaScript）
- **状态管理**: 全局变量 + localStorage
- **语音合成**: Web Speech API (`speechSynthesis`)
- **样式**: 内联 CSS，使用 CSS Grid 和 Flexbox 布局

---

## 已实现功能

### 被动打卡系统 (Passive Check-in System) - 2026-03-10

**实现状态**: ✅ 已完成

**功能描述:**
- 将主动打卡改造为被动打卡系统
- 用户完成测验且正确率达到80%以上时自动触发打卡
- 无需手动点击打卡按钮

**核心功能:**
1. **自动触发**: 测验完成且≥80%正确率时自动打卡
2. **重复 Prevention**: 同一天内不会重复打卡
3. **连续奖励**: 每7天连续签到额外奖励20分
4. **断签惩罚**: 中断连续签到扣除50分

**关键代码位置:**
- `autoCheckIn(score, total)` - 主函数 (第706行)
- `showCompletion()` - 集成点 (第1058行调用)
- `getTodayString()` / `getYesterdayString()` - 辅助函数 (第694-705行)

**测试验证:**
- 使用 Playwright + TypeScript 测试框架
- 测试文件位于 `tests/` 目录
- 结果存储在 `test-results/` 目录
- 测试尽量不要用有头模式
- 测试时输出中间结果
- 测试时如果有case失败，停下来修复再继续
- 覆盖7个测试场景，21个子测试用例

## TODO.md
- 待做事情列表

## LESSONS_LEARNED.md
- 经验教训总结、问题的解决方法等的存放文件 

## Code Modification rules
- NO sed for code edits: 禁止使用 sed 或复杂的正则 shell 命令修改源代码。这会导致意外的全局替换。
- Prefer str_replace or Full Write: 修改代码时，必须使用完整的代码块替换，或读取文件后重新写入，以确保语法正确。
- Scope Sensitivity: 所有的修改必须限制在函数/类定义的范围内，禁止跨行正则匹配。

## ALWAYS
- Show diff before committing

## Compact Instructions
Preserve:
1. Architecture decisions (NEVER summarize)
2. Modified files and key changes
3. Current verification status (pass/fail commands)
4. Open risks, TODOs, rollback notes
