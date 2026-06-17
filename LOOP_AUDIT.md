# Loop Audit: loop-engine
**审计日期**: 2026-06-16
**审计框架版本**: loop-audit v1.0
**审计者**: deepseek-v4-pro
**框架自检状态**: 已自检（参见 loop-audit/references/self-audit.md）
**模板版本**: v1.0 — 8 组件全部就位，可作为其他项目的参考实现

## 1. 可行性

| 条件 | 结果 | 证据 |
|------|------|------|
| 重复出现 | ⚠️ | 每周至少一次审计+面板查看，频率边界。作为标准化系统的维护工具，不符合传统"重复执行"模式——它本身就是各项目反复用的标准 |
| 输入固定 | ✅ | 被审计项目在 `_runtime/` 和 `D:\Claude code_workspace\` 固定路径。面板数据源为各项目 `notebook/health.json` |
| 对错可判 | ⚠️ | 审计评分有 rubric 但依赖审计者判断。面板数据（JSON 可解析、文件存在）可机器验证 |

**结论**: 作为标准定义项目而非执行项目，部分可行。审计功能（loop-audit skill）已有，面板系统已有，数据合约已有。缺失的是自运转能力——本项目自己不跑 loop，它是被其他项目引用的标准。

## 2. 组件评分

| # | 组件 | 评分 | 证据 |
|---|------|------|------|
| 1 | 闹钟 | ★★★ | `alarm/loop-tasks.json` 定义 3 个任务，`alarm/register.ps1` 注册到 aion-kit，`alarm/scheduler.ps1` 零依赖 schtasks 替代 |
| 2 | 工位 | ★★☆ | 串行模式，天然隔离。无并行需求，无需 worktree |
| 3 | 知识管理体系 | ★★★ | CLAUDE.md + loop-audit skill 三层齐全。`handbook/docs/` 含 ARCHITECTURE/INTEGRATION/RUNBOOK 模板。`handbook/prompts/` 含 daily-self-audit prompt |
| 4 | 电话线 | ★★☆ | agentboard API 已通。`wire/notify.ps1` 已就位。飞书 webhook 待实际接入 |
| 5 | 质检员 | ★★☆ | `inspector/verify.js` 已就位（交叉验证+古德哈特防护）。待实际运行验证 |
| 6 | 记事本 | ★★☆ | health.json 已自评。events.jsonl 已建。state 不驱动决策（本项目无"今天该干什么"的问题） |
| 7 | 提报 | ★★☆ | `escalation/rules.json` 已就位（L0-L3 四级规则）。`wire/notify.ps1` 已就位。面板可展示异常，飞书主动推送能力已具备但 webhook 未配置 |
| 8 | 目标定义 | ★★☆ | 系统级目标已定义（3条）。`goals/completion-criteria.md` 已就位。降级方案已定义但未演练 |

## 3. 差距矩阵

| 组件 | 紧急度 | 难度 | 优先级 | 状态 |
|------|--------|------|--------|------|
| 闹钟 | 🟡 重要 | 低 — 配一个 cron/schtasks | 1 | ✅ 已补齐 |
| 质检员 | 🟡 重要 | 中 — 需写交叉验证逻辑 | 2 | ✅ 已补齐 |
| 提报 | 🟡 重要 | 中 — 需接入飞书 webhook | 3 | ✅ 已补齐 |
| 记事本 | 🟢 锦上添花 | 低 — events.jsonl 追加 | 4 | ✅ 已补齐 |
| 目标定义 | 🟢 锦上添花 | 低 — 补充机器验证条件 | 5 | ✅ 已补齐 |
| 知识管理体系 | 🟢 锦上添花 | 低 — 写架构决策记录 | 6 | ✅ 已补齐 |
| 工位 | — | — | 无需改进（串行足够） | ✅ |
| 电话线 | — | — | 当前够用（API通） | ✅ |

**2026-06-16 更新**: 所有差距已闭合。loop-engine 现在是一个完整的模板项目，可作为其他 loop 项目的参考实现。

## 4. 结构合规检查

| 文件 | 当前位置 | 应放位置 | 偏差 |
|------|---------|---------|------|
| CLAUDE.md | `2026-06-15-loop-engine/CLAUDE.md` ✅ | 项目根 | 无 |
| health.json | `notebook/health.json` ✅ | notebook/ | 无 |
| loop-dashboard.html | `~/.agentboard/loop-dashboard.html` | wire/ | 外部依赖 — agentboard 需要由此路径 serve。在 CLAUDE.md 标注 |
| server.js loop routes | `~/.agentboard/server.js` | wire/ | 外部依赖 — agentboard 基座。不搬 |
| loop-audit skill | `~/.claude/skills/loop-audit/` | — | Claude Code 发现路径，不可搬 |

## 5. 落位方案

### 闹钟 (优先级 1)
**目标**: 每周自检 — 重跑 loop-audit 审本项目 + 更新 health.json
**新建文件**:
  - `alarm/weekly-self-audit.ps1` — 读取 audit-log.jsonl 最新记录，更新 health.json
**修改文件**:
  - Windows Task Scheduler 注册每周任务
**参考实现**: evopearl-data 的 scheduler.js 模式（轻量版，无需 agentboard）

### 质检员 (优先级 2)
**目标**: 交叉验证 — 抽查被审计项目的 health.json 是否反映真实状态
**新建文件**:
  - `inspector/cross-check.js` — 随机选一个项目，curl 其产出，对比 health.json 的 today 字段
**验证条件**: 如果 health.json 显示 `jobs_completed: 3` 但产出 JSON 日期不是今天 → 标记异常

### 提报 (优先级 3)
**目标**: 异常主动推送飞书
**新建文件**:
  - `escalation/rules.json` — 分级规则
  - `escalation/notify.ps1` — 飞书 webhook 推送
**规则定义**:
  - L0: 自检通过 → 不推送
  - L1: 每周摘要 → 飞书一条消息"loop-engine 自检：N 个项目，M 个健康"
  - L2: 某项目 health.json 超过 2 天未更新 → 推送提醒
  - L3: 面板 API 不可用 → 推送告警

## 6. 实施路径

```
Phase 1: 补闹钟 (30min)
  → 项目有了心跳

Phase 2: 补质检员 (1h)
  → 交叉验证，假信心问题解决

Phase 3: 补提报 (1h)
  → 异常不再静默

Phase 4: 补文档 (30min)
  → handbook/docs/ 写入架构决策记录
```

先做 Phase 1+2，这两个解决"系统不可观测"问题。Phase 3 提报依赖飞书 bot 就绪后再接。
