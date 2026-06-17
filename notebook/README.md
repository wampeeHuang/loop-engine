# 记事本 — 跨会话状态

Agent 醒来就知道历史——昨天试了什么、今天该干什么、上一次成功是什么时候。

## 双文件系统

| 文件 | 驱动决策？ | 用途 |
|------|-----------|------|
| `health.json` | ✅ | 结构化自评，被联邦面板读取，Agent 启动时检查 |
| `events.jsonl` | ❌ | 事件日志，每次运行的审计追踪，只追加不修改 |

## health.json 格式

```json
{
  "project": "项目名",
  "updated": "ISO8601",
  "health": {
    "alarm":       { "status": "ok|warn|missing", "score": 0-3, "detail": "" },
    "workstation": { ... },
    "knowledge":   { ... },
    "connectors":  { ... },
    "inspector":   { ... },
    "notebook":    { ... },
    "escalation":  { ... },
    "goals":       { ... }
  },
  "today": {
    "jobs_total": 0,
    "jobs_completed": 0,
    "jobs_failed": 0,
    "last_run": "ISO8601 or null",
    "last_output": "产出摘要 or null"
  },
  "escalation": {
    "active_alerts": 0,
    "last_escalated": "ISO8601 or null"
  },
  "audit_score": 0.0,
  "audit_date": "ISO8601"
}
```

## events.jsonl 格式

每行一条 JSON，只追加不修改：

```json
{"ts":"ISO8601","event":"daily-self-audit|cross-check|escalation|manual","detail":{...}}
```

## 设计原则

1. **health.json 是决策驱动**：Agent 醒来读它，判断"今天跑过了没"、"有没有待解决的告警"
2. **events.jsonl 是审计追踪**：不驱动决策，用于调查"为什么那天出了问题"
3. **不能只有结果没有过程**：health.json 的 today.jobs_completed=3 不够，events 里要有每次的 exit code 和产出摘要
4. **状态防漂移**：每次写 health.json 前重新读文件，不要基于内存中的旧状态写回
