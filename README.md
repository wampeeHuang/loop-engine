# Loop Engine

**AI 项目管理系统的参考实现。** 8 组件模型，让 AI agent 项目具有自检、自愈、可观测能力。

> 你不是在"prompt AI 做事"，你是在**设计一套让 AI 自己管自己的系统**。

---

## 设计方法论

这份架构不是凭空设计的。每条原则都来自真实系统的调研——读了原文、搜了社区批评、提取了可操作的部分。

### 调研了什么

分析了 **4 个理论框架 + 3 个实战系统**，各取所长：

| 来源 | 借鉴了什么 | 拒绝了什么 |
|------|-----------|-----------|
| Addy Osmani · Loop Engineering | 反馈环思维、comprehension debt 概念 | Google ASR 调试案例（太复杂） |
| Boris Cherny · WorkOS | Underfund Principle——用约束倒逼自动化 | 数百并行实例（单机跑不起） |
| Peter Steinberger · OpenClaw | Compound operations 复利思维 | 链式 Agent 路由（过度工程） |
| Google OKF | Markdown+YAML 文件知识库 | 云服务托管（本地文件+git 够用） |
| KUN Studio · 4 Agent SaaS | Agent 不互调、$5 审批线 | Linux cron+VPS（Windows 环境） |
| Koka Sexton · 三层质检 | L1→L2→L3 分层质检模型 | 纯文本维度（需覆盖代码+数据+配置） |
| wulixfr · 9 Agent Python | BaseAgent 五步骨架、"第一天跑通" | Gemini 免费层（模型策略不同） |

### 五条设计原则

每条原则对应一个具体的失败模式——不是装饰，是教训：

1. **骨肉物理隔离** — 骨件（工具架/宪法/skills）和肉件（项目/数据）分盘存放，复制即迁移
2. **失败必须可见** — 静默失败比报错危险。任何执行不论成败都有日志
3. **唯一真相源** — 每条数据只有一个家。真相在文件里，不在服务里
4. **薄工具架** — 定义在项目，执行在独立调度器，面板做可见性。面板熄了项目照跑
5. **一次只改一个首要方向** — 不铺开所有改进同时做

### 方案选型：薄工具架 vs 厚工具架

用 **Karpathy 四标准** 直接比较两个真正的架构选项：

| 验证标准 | 厚工具架 | 薄工具架 |
|---------|---------|---------|
| 1. 杀面板，项目能跑？ | ❌ | ✅ |
| 2. 复制到新机直接工作？ | ❌ | ✅ |
| 3. Token 安全？ | 平手 | 平手 |
| 4. 新项目接入改几处？ | 3+ | 0 |

**薄工具架 4/4 全胜。** 不是偏好，是验证结果。

### 八条验收标准

不是愿望清单——每条有可验证的通过条件：

| # | 标准 | 怎么验 |
|---|------|--------|
| G1 | Kill 面板，项目独立跑完 cron 任务 | 系统原生调度 + crontab.txt 兜底 |
| G2 | 任意项目复制到新机器，能直接工作 | 项目自包含：CLAUDE.md + notebook/ + alarm/ |
| G3 | 任何 cron 执行，不论成败，都有日志 | 事件日志有记录，包括 stderr |
| G4 | 文件操作失误可以回滚 | git + 备份 + 回收站机制 |
| G5 | 新项目接入不改面板代码 | 建 2 文件（CLAUDE.md + health.json），面板自动发现 |
| G6 | AI 自动知道有什么工具、怎么调 | 读 /api/tools 返回 conflicts + agent_notes |
| G7 | 跨会话任务不丢 | HANDOFF.md + memory 指针 |
| G8 | 踩过的坑不踩第二遍 | agent_notes 写入工具 manifest |

### 明确不做的事

跟"做什么"同样重要的是"不做什么"：

- 不做公网 SaaS 面板（单机工具架，公网只读静态 deploy）
- 不做实时监控告警（轮询+日报即可）
- 不做 Docker/K8s（单机环境，容器化成本>收益）
- 不做 AI 自动修复任意错误（自愈只限已知模式）
- 不做跨机器 agent 调度（只有一台机器，先搞定单机）

### 完整方法论

👉 **[在线浏览](https://wampeehuang.github.io/loop-engine/ARCHITECTURE-generic.html)** · [源码](ARCHITECTURE-generic.html) — 含全部调研细节、方案对比、决策记录（1400 行，零个人信息，可直接对外发布）

---

## 8 组件模型

| # | 组件 | 一句话 | 核心文件 |
|---|------|--------|---------|
| 1 | 🔔 闹钟 | 什么时候跑 | `alarm/loop-tasks.json` |
| 2 | 🏗 工位 | 怎么隔离不打架 | git worktree |
| 3 | 📖 员工手册 | 知道怎么跑 | `CLAUDE.md` + `handbook/` |
| 4 | 📞 电话线 | 连接外部世界 | `wire/` |
| 5 | 🔍 质检员 | 验证产出不是"声称完成" | `inspector/verify.js` |
| 6 | 📝 记事本 | 状态存在哪 | `notebook/health.json` + `events.jsonl` |
| 7 | 🚨 提报 | 出问题通知谁 | `escalation/rules.json` |
| 8 | 🎯 目标定义 | 什么叫"跑成功了" | `goals/completion-criteria.md` |

组件间通过文件通信，不互相调用——一个挂了不影响其他。

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
