# Loop Engine

**AI 项目管理系统的参考实现。** 8 组件模型，让 AI agent 项目具有自检、自愈、可观测能力。

> 你不是在"prompt AI 做事"，你是在**设计一套让 AI 自己管自己的系统**。

---

## 这是什么

Loop Engine 是一个**管理 AI 自动化项目的元系统**。它不是跑某个具体任务，而是管所有任务的健康状态——像给一群 AI agent 装了体检 + 闹钟 + 警报器。

适用场景：你有多个 Claude Code / AI agent 项目在跑（数据采集、内容生产、定时检查等），需要知道：
- 它们今天跑了没有？跑成功了吗？
- 产出文件是不是真的存在（不是说"完成了"就算）？
- 连续失败谁来通知？
- 项目知识有没有在积累，还是每次从零开始？

## 核心理念

```
人 → 设计系统（loop）
     ↓
系统 → 调度 agent → 执行任务 → 验证产出 → 记录状态 → 异常提报
     ↓
人 → 只在需要判断力时介入
```

**人从"操作员"变成"系统设计师"。** 日常运行、重试、日志全部自动化。人只处理机器判不了的——审美、策略、边界决定。

## 8 组件模型

每个 loop 项目包含 8 个组件，用 4 句人话命名：

| # | 组件 | 一句话 | 核心文件 |
|---|------|--------|---------|
| 1 | 闹钟 | 什么时候跑 | `alarm/loop-tasks.json` |
| 2 | 工位 | 怎么隔离不打架 | 串行 or git worktree |
| 3 | 知识管理 | 知道怎么跑 | `CLAUDE.md` + `handbook/` |
| 4 | 电话线 | 连接外部世界 | `wire/` — API/飞书/GitHub |
| 5 | 质检员 | 验证产出不是"声称完成" | `inspector/verify.js` |
| 6 | 记事本 | 状态存在哪 | `notebook/health.json` + `events.jsonl` |
| 7 | 提报 | 出问题通知谁 | `escalation/rules.json` |
| 8 | 目标定义 | 什么叫"跑成功了" | `goals/completion-criteria.md` |

每个组件独立、可替换、有标准文件格式。组件间通过文件通信，不互相调用——一个挂了不影响其他。

## 项目结构

```
my-loop-project/
├── CLAUDE.md                  # 项目宪法（硬规则 + 踩坑警示）
├── alarm/
│   ├── loop-tasks.json        # 任务定义
│   ├── register.ps1           # 注册到调度器
│   └── scheduler.ps1          # Windows 任务计划器注册
├── notebook/
│   ├── health.json            # 8 组件健康评分
│   └── events.jsonl           # 事件日志（只追加）
├── inspector/
│   └── verify.js              # 零依赖交叉验证
├── escalation/
│   └── rules.json             # L0-L3 四级提报规则
├── goals/
│   └── completion-criteria.md  # 机器可验证完成标准
├── wire/
│   ├── notify.ps1             # 飞书/邮件通知
│   └── deploy.ps1             # 部署脚本
├── handbook/
│   ├── docs/                  # 架构/接入/运维文档
│   └── prompts/               # Agent 执行指令模板
├── data/                      # 产出文件
└── _runtime/                  # 临时文件（不进 git）
```

## 快速开始

### 1. 理解概念

打开 [`ARCHITECTURE-generic.html`](ARCHITECTURE-generic.html) 看完整设计文档——调研了什么、为什么这样设计、每一步的决策记录。通用版，零个人信息，可对外发布。

### 2. 从模板初始化新项目

```bash
# 用 loop-init skill 引导创建
# 会在目标目录生成完整 8 组件骨架
claude -p "用 loop-init 在 /path/to/new-project 初始化 loop 项目"
```

### 3. 审计已有项目

```bash
# 检查一个项目离 8 组件标准差多远
claude -p "对 /path/to/existing-project 运行 loop-audit"
```

### 4. 跑起来

```bash
# 注册闹钟（二选一）
./alarm/register.ps1    # 注册到 aion-kit cron 调度器
./alarm/scheduler.ps1   # 注册到 Windows 任务计划器

# 手动跑一次验证
node inspector/verify.js
```

## 关键设计决策

- **文件通信，Agent 不互调** — 组件之间通过读写文件通信，不直接调用。解耦、可独立调试
- **对错可判交机器，判断留给人** — inspector 验证"产出文件在不在/过没过期"，不验证"写得好不好"
- **禁止静默失败** — 所有异常必须有可见输出（event log + escalation）
- **古德哈特防护** — 不只信 health.json 的"ok"，交叉验证实际产出文件
- **L0-L3 四级提报** — 首次失败自动重试，连续异常才推给人

## 与 Claude Code 的关系

- Loop Engine 是**管理系统**，不是 Claude Code 插件
- Claude Code 是执行引擎——loop 调 Claude Code 跑任务
- `loop-audit` 和 `loop-init` 是 Claude Code skills，放在 `~/.claude/skills/`
- 联邦健康面板通过 agentboard API 汇聚所有项目的 health.json

## 配套资源

- [`ARCHITECTURE-generic.html`](ARCHITECTURE-generic.html) — 完整设计文档 · 通用版（含调研、选型、施工记录，零个人信息，可对外发布）
- `ARCHITECTURE.html` — 原版（含本地环境信息，仅内部参考）
- `~/.claude/skills/loop-audit/` — 审计技能（8 组件差距分析）
- `~/.claude/skills/loop-init/` — 初始化技能（4 Phase 引导搭建）
- `~/.agentboard/loop-dashboard.html` — 联邦健康面板

## 许可

MIT

---

**维护者**: [@wampeeHuang](https://github.com/wampeeHuang)
**版本**: v1.0.0
**状态**: 活跃开发中 · 3 个项目在生产运行
