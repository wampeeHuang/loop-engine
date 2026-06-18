# loop-engine 循环宪法

> Loop 工程体系的总项目。管理 loop-audit 技能、联邦健康面板、提报标准。
> 审计他人者必先自审。

## 闹钟

- **当前状态**: 已就位。`alarm/loop-tasks.json` 定义 3 个任务（每周自检/交叉验证/汇总提报）。
- **注册方式**: `alarm/register.ps1` → aion-kit (`:3099`)，或 `alarm/scheduler.ps1` → Windows 任务计划器（零依赖）。
- **参考实现**: aion-kit (`D:\workspace\2026-06-15-aion-kit`) 是闹钟组件的独立实现。

## 工位

- **隔离方式**: 串行，单会话操作。无并行需求。
- **无 worktree**。

## 知识管理体系

| 层 | 文件 | 内容 |
|----|------|------|
| L1 规则 | 本文件 | hard rules + 踩坑警示 |
| L2 技能 | `~/.claude/skills/loop-audit/SKILL.md` | 审计框架（Claude Code 发现路径） |
| L2 技能 | `~/.claude/skills/loop-init/SKILL.md` | 初始化向导——从零搭建 loop 项目 |
| L2 参考 | `~/.claude/skills/loop-audit/references/` | framework.md, project-structure.md, self-audit.md |
| L3 文档 | `handbook/docs/` | 架构决策记录(ARCHITECTURE.md)、接入指南(INTEGRATION.md)、运维手册(RUNBOOK.md) |
| L3 文档 | `handbook/prompts/` | Agent 执行指令模板(daily-self-audit.md) |
| L3 面板 | `~/.agentboard/loop-dashboard.html` | 联邦健康面板（agentboard /loop 路由） |
| L3 API | `~/.agentboard/server.js` § loop routes | `/api/loop/health`, `/loop` |
| 闹钟引擎 | `D:\workspace\2026-06-15-aion-kit` | aion-kit cron 调度器 (`:3099/cron`) |

**技能 vs 项目关系**: loop-audit skill 是执行标准，loop-engine 项目是系统总目录。skill 路径不能搬（Claude Code 只发现 `~/.claude/skills/`），但本项目的 CLAUDE.md 是系统的唯一宪法。

## 电话线

| 连接 | 方式 | 位置 |
|------|------|------|
| 各项目 health.json | agentboard `/api/loop/health` 扫描 `_runtime/` | server.js |
| 飞书提报 | （待建）每个项目独立的 webhook | 各项目 escalation/ |
| 联邦面板 | agentboard `/loop` 路由 | loop-dashboard.html |

## 质检员

**当前状态: 已就位。**

- `inspector/verify.js` — Node.js 零依赖交叉验证脚本。随机抽一个已审计项目，对比 health.json 和实际产出。
- 古德哈特防护: 验证条件检查"health 显示完成的 job 但产出文件不存在/过期"这类矛盾。
- 交叉验证: 不定期抽查被审计项目，对比 health.json 是否反映真实状态

## 记事本

| 文件 | 类型 | 驱动决策？ |
|------|------|-----------|
| `notebook/health.json` | 结构化自评 | ✅ 联邦面板读取 |
| `notebook/events.jsonl` | 事件日志 | ❌ 审计追踪用 |

## 提报

**当前状态: 已就位。**

- `escalation/rules.json` — L0-L3 四级提报规则，机器可解析。
- `wire/notify.ps1` — 飞书 webhook 推送脚本，webhook URL 走 `$env:FEISHU_WEBHOOK`。
- 提报逻辑在各被审计项目的 `escalation/` 下，loop-engine 的职责是定义提报标准。

## 目标定义

**系统级目标**:
- 每个 loop 项目有 `CLAUDE.md` + `notebook/health.json`
- 联邦面板能显示所有项目的真实健康状态
- loop-audit 技能保持自迭代（审计日志驱动改进）

**边界约束**:
- 面板不控制项目——纯读层
- 技能不自动修改项目文件——审计输出建议，由人决策
- 不引入中央监控引擎——项目自包含

**降级路径**: 面板挂了 → 各项目 independent health.json 不受影响 → 手动读文件

## 踩坑警示

- loop-audit skill 路径不能动（`~/.claude/skills/loop-audit/`）——Claude Code 只扫描此目录发现技能
- agentboard 面板路径在 `~/.agentboard/loop-dashboard.html`——server.js `/loop` 路由读此文件
- 不要混淆两个概念：loop-engine（本项目，系统工程）vs loop-audit（技能，审计工具）vs loop-monitor（面板，可视化层）

## 项目速查

| 项目 | 值 |
|------|-----|
| 工作目录 | `D:\workspace\loop-engine` |
| 面板地址 | `http://localhost:3099/loop` |
| 面板源码 | `~/.agentboard/loop-dashboard.html` |
| 技能目录 | `~/.claude/skills/loop-audit/` |
| 审计日志 | `~/.claude/skills/loop-audit/_runtime/audit-log.jsonl` |
