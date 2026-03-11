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

