# KET 单词学习网页应用

![KET 单词学习](https://img.shields.io/badge/License-ISC-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Playwright](https://img.shields.io/badge/Playwright-1.58.2-blue.svg)

一个专为 KET (Key English Test) 考生设计的互动式单词学习网页应用，采用可爱的多啦A梦主题设计，帮助用户通过趣味闯关的方式积累词汇。

## 📋 功能特性

### 核心功能
- **学习模式** - 浏览单词卡片，查看发音、词性、音标、中文含义和例句
- **闯关测验** - 通过选择题的形式测试单词掌握程度，支持英文→中文和中文→英文两种题型
- **积分系统** - 完成测验获得积分，每日打卡奖励
- **关卡解锁** - 完美通关自动解锁下一关，完成单元最后一关解锁下一单元相同数据源的第一关
- **语音朗读** - 使用 Web Speech API 朗读英文单词，支持自定义发音速度
- **进度追踪** - 使用 localStorage 持久化用户学习进度

### UI 特色
- 🐱 多啦A梦主题 - 蓝色系配色，亲切友好
- 🎮 游戏化学习 - 闯关机制激发学习动力
- 🎆 烟花特效 - 完美通关时播放烟花动画
- 📊 可视化进度 - 实时显示积分、连续打卡天数
- 🔓 关卡状态标识 - 清晰的锁定/解锁/完成状态图标

## 🗂️ 项目结构

```
ket_word_learning/
├── ket-learning.html          # 单文件应用（HTML + CSS + JavaScript）
├── ket.json                  # 单词数据（14 个单元 × 2 种类型 × 1-4 关卡）
├── package.json              # 项目配置
├── playwright.config.ts        # Playwright 配置
├── start-server-and-test.sh  # 开发服务器并运行测试脚本
├── tests/                   # 测试目录
│   ├── level-unlock.spec.ts   # 关卡解锁逻辑测试（11 个测试用例）
│   └── quiz-simple.spec.ts   # 基础测验功能测试
├── playwright-report/         # 测试报告目录
└── test-results/             # 测试截图输出
```

## 🚀 快速开始

### 环境要求
- Node.js >= 14.x
- 现代浏览器（Chrome, Firefox, Edge, Safari）

### 安装步骤
```bash
# 克隆仓库
git clone https://github.com/colaghost/ket_word_learning.git

# 安装依赖
npm install

# 启动开发服务器
npm start

# 应用将在 http://localhost:8080 运行
```

### 开发命令
```bash
# 运行所有测试
npm test

# 运行测试并显示 UI（headed 模式）
npm run test:ui

# 运行特定测试文件
npm test -- tests/level-unlock.spec.ts

# 运行测试并显示报告
npm run test:report
```

## 📖 项目文档

- **CLAUDE.md** - 项目开发指南和工作流程
- **LESSONS_LEARNED.md** - 经验教训和问题解决记录

## 🧪 数据结构

### 关卡数据格式 (ket.json)
每个关卡数据包含：
```json
{
  "unit1-pretest": {
    "name": "Unit 1 前测",
    "levels": [
      {
        "id": "unit1-pretest-1",
        "words": [...]
      }
    ]
  }
}
```

### 单词数据格式
```javascript
{
  "单词": "apple",
  "词性": "n.",
  "音标": "/ˈæpl/",
  "中文含义": "苹果",
  "例句": "I like to eat apples."
}
```

### 用户数据结构
```javascript
{
  "points": 0,              // 积分
  "streak": 0,              // 连续打卡天数
  "lastCheckIn": null,       // 上次打卡日期
  "unlockedLevels": [],      // 已解锁关卡列表
  "completedLevels": []      // 已完成关卡列表
}
```

## 🧪 测试

### 测试覆盖
项目使用 Playwright 进行端到端测试，覆盖以下场景：

| 测试文件 | 描述 | 测试用例数 |
|----------|------|-----------|
| `level-unlock.spec.ts` | 关卡解锁逻辑测试 | 11 |
| `quiz-simple.spec.ts` | 基础测验功能测试 | 3 |

### 关卡解锁测试场景
1. ✅ 同单元解锁（完美通关）
2. ✅ 非完美通关不解锁
3. ✅ 函数存在性验证
4. ✅ Level ID 格式验证
5. ✅ UI 状态和截图验证
6. ✅ 初始状态验证（新用户）
7. ✅ 数据迁移验证
8. ✅ 跨单元解锁 (pretest)
9. ✅ 跨单元解锁 (wordlist)
10. ✅ 单元边界测试

### 运行测试
```bash
# 运行所有测试
npm test

# 查看测试报告
npm run test:report

# 在项目根目录打开测试报告 HTML
open playwright-report/index.html
```

## 🎯 关卡解锁逻辑

### 解锁规则
1. **同单元内解锁** - 完美通关当前关卡自动解锁同一数据源的下一关
2. **跨单元解锁** - 完成单元最后一关自动解锁下一单元相同数据源的第一关
3. **初始状态** - 新用户首次访问时，`unit1-pretest-1` 和 `unit1-wordlist-1` 自动解锁
4. **数据迁移** - 已有用户数据中缺少 `unit1-wordlist-1` 时，刷新页面自动添加
5. **单元边界** - 完成最后一个单元的最后一关后，不尝试解锁不存在的关卡

### Level ID 格式
```
{unit}-{source}-{index}
```
- `unit`: 单元编号 (unit1, unit2, ...)
- `source`: 数据源类型 (pretest, wordlist)
- `index`: 关卡索引 (1, 2, 3, ...)

### 关键函数
- `unlockNextLevel(levelId)` - 执行解锁逻辑的核心函数
- `init()` - 初始化函数，包含数据迁移逻辑

## 🔧 技术栈

### 前端
- **HTML5** - 语义化标签
- **CSS3** - 现代化样式
- **原生 JavaScript (ES6+)** - 无框架，无构建步骤
- **Web Speech API** - 浏览器原生语音合成

### 测试
- **Playwright** - 跨浏览器 E2E 测试框架
- **TypeScript** - 测试代码类型安全

### 状态管理
- **localStorage** - 持久化用户进度数据
- **全局变量** - `userData`, `levelData`, `quizGame` 等

## 📄 许可证

本项目采用 **ISC 许可证**，允许自由使用、修改和分发。

## 🤝 贡献指南

欢迎贡献！如果你发现 bug 或有功能改进建议，欢迎提交 Pull Request。

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/your-feature`)
3. 进行开发和测试
4. 提交更改 (`git commit`)
5. 推送到你的分支 (`git push origin feature/your-feature`)
6. 创建 Pull Request

### 代码规范
- 遵循 ESLint 配置（如果已配置）
- 编写清晰的注释
- 遵循项目现有代码风格
- 提交信息使用清晰的描述

## 📞 更新日志

### v1.0.0
- ✅ 添加关卡解锁逻辑自动化测试套件
- ✅ 修复关卡解锁逻辑（数据迁移 + 跨单元解锁）
- ✅ 7/11 核心功能测试稳定通过

## 📮 相关资源

- [KET 官方](https://www.cambridgeenglish.org/exams-and-tests/key) - KET 考试信息
- [Playwright 文档](https://playwright.dev/) - 测试框架文档

## 📧 联系方式

如有任何问题或建议，欢迎通过以下方式联系：
- 提交 [Issue](https://github.com/colaghost/ket_word_learning/issues)
- 查看 [项目文档](./CLAUDE.md)

---

**Happy Learning! 🎓**
