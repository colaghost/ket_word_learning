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

## 扩展建议 (待实现)

### 1. 单词收藏/错题本功能

**需求描述:**
- 在学习模式下，用户可以收藏当前单词
- 测验中答错的单词自动加入错题本
- 提供收藏/错题本页面查看列表
- 支持对收藏单词进行复习测验

**数据结构扩展:**
```javascript
userData = {
    // ... 现有字段
    favorites: [],      // 收藏的单词 [{word: "apple", levelId: "unit1-pretest-1", timestamp: ...}]
    wrongWords: [],     // 错题本 [{word: "apple", levelId: "unit1-pretest-1", wrongCount: 3, timestamp: ...}]
}
```

**需要添加的功能:**
- `toggleFavorite(word)` - 切换单词收藏状态
- `addToWrongWords(word, levelId)` - 添加到错题本
- `showFavoritesPage()` - 显示收藏页面
- `showWrongWordsPage()` - 显示错题本页面
- `renderFavoriteWords()` / `renderWrongWords()` - 渲染列表

---

### 2. 单词发音速度调整

**需求描述:**
- 在学习模式添加速度滑块控件 (0.5x - 2.0x)
- 用户可以保存个人偏好的发音速度
- 默认速度为 0.8 (当前值)

**数据结构扩展:**
```javascript
userData = {
    // ... 现有字段
    speechRate: 0.8      // 发音速度 (0.5 - 2.0)
}
```

**需要修改的功能:**
- `speakWord(word)` - 使用 `userData.speechRate` 替代硬编码的 0.8
- `renderStudyWord()` - 添加速度调节滑块 UI
- `updateSpeechRate(rate)` - 更新并保存速度设置

---

### 3. 学习进度图表

**需求描述:**
- 在首页或新增进度页面显示学习数据可视化
- 图表类型：
  - 学习天数折线图
  - 每日学习单词数柱状图
  - 单元完成进度环形图
  - 测验正确率趋势图

**数据结构扩展:**
```javascript
userData = {
    // ... 现有字段
    studyHistory: [
        {date: "2026-03-01", wordsLearned: 20, quizScore: 80, minutesSpent: 30}
    ]
}
```

**需要添加的功能:**
- `recordStudyProgress(data)` - 记录每日学习数据
- `showProgressPage()` - 显示进度页面
- 使用 Chart.js 或手写 SVG 绘制图表

---

### 4. 自定义学习计划

**需求描述:**
- 用户可以设置每日学习目标（单词数量、学习时间）
- 根据目标推荐每日学习任务
- 显示目标完成进度条

**数据结构扩展:**
```javascript
userData = {
    // ... 现有字段
    studyPlan: {
        dailyWordsGoal: 30,
        dailyMinutesGoal: 20,
        weeklyQuizGoal: 3
    },
    todayProgress: {
        wordsLearned: 0,
        minutesSpent: 0,
        quizzesCompleted: 0
    }
}
```

**需要添加的功能:**
- `showStudyPlanPage()` - 显示学习计划设置页面
- `updateStudyPlan(plan)` - 更新学习计划
- `getRecommendedLevels()` - 根据计划推荐关卡
- `checkDailyGoals()` - 检查每日目标完成情况

---

### 5. 复习提醒功能

**需求描述:**
- 使用浏览器 Notifications API 发送学习提醒
- 用户可设置提醒时间（如每天 20:00）
- 间隔复习提醒（艾宾浩斯遗忘曲线：1天、3天、7天、14天）

**数据结构扩展:**
```javascript
userData = {
    // ... 现有字段
    reminderSettings: {
        enabled: true,
        dailyTime: "20:00",
        intervalDays: [1, 3, 7, 14]
    },
    nextReviewDate: null  // 下次复习日期
}
```

**需要添加的功能:**
- `setupReminderScheduler()` - 设置提醒调度器
- `requestNotificationPermission()` - 请求通知权限
- `scheduleDailyReminder()` - 安排每日提醒
- `scheduleReviewReminder(word, reviewDate)` - 安排复习提醒
- `showReminderSettings()` - 显示提醒设置页面

## LESSONS_LEARNED.md
- 经验教训总结、问题的解决方法等的存放文件 

## Code Modification rules
- NO sed for code edits: 禁止使用 sed 或复杂的正则 shell 命令修改源代码。这会导致意外的全局替换。
- Prefer str_replace or Full Write: 修改代码时，必须使用完整的代码块替换，或读取文件后重新写入，以确保语法正确。
- Scope Sensitivity: 所有的修改必须限制在函数/类定义的范围内，禁止跨行正则匹配。
