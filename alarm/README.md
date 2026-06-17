# 闹钟 — 触发 + 调度

loop 的心跳。不需要人手动启动，闹钟响了 loop 自己开始跑。

## 两轨方案

| 方案 | 适用场景 | 文件 |
|------|---------|------|
| **aion-kit** | 富功能：Web 仪表盘、运行历史、REST API、失败重试 | `loop-tasks.json` + `register.ps1` |
| **schtasks** | 零依赖：Windows 原生定时任务，不跑额外服务 | `loop-tasks.json` + `scheduler.ps1` |

两轨共享同一个 `loop-tasks.json` 格式。选哪个执行引擎取决于项目需求，任务定义不变。

## loop-tasks.json 格式

```json
{
  "$description": "项目名 — loop 任务定义",
  "tasks": [
    {
      "project_id": "my-project",
      "project_dir": "D:\\path\\to\\project",
      "name": "每日自检",
      "cron_expr": "0 9 * * *",
      "prompt": "根据 CLAUDE.md 跑每日自检，更新 notebook/health.json",
      "timeout_sec": 600,
      "enabled": true
    }
  ]
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `project_id` | 项目标识，aion-kit 用此字段分组 |
| `project_dir` | 项目绝对路径，claude 在此目录执行 |
| `name` | 任务名，显示在仪表盘 |
| `cron_expr` | 五字段 cron：分 时 日 月 星期 |
| `prompt` | 传给 `claude -p` 的 prompt |
| `timeout_sec` | 超时秒数，超时后强制终止 |
| `enabled` | true/false，暂停用 |

### cron 速查

```
分 时 日 月 星期
0   9   *  *   *      每天 9:00
*/30 *  *  *   *      每 30 分钟
0   9   *  *   1-5    工作日 9:00
0   9   *  *   1      每周一 9:00
```

## 闹钟设计原则

1. **闹钟只负责触发，不负责执行逻辑**。prompt 告诉 Agent 做什么，Agent 读 CLAUDE.md 决定怎么做
2. **防重复**：记事本检查"今天已跑过"，不依赖闹钟去重
3. **闹钟停了要知道**：提报组件联动——如果超过预期时间没有 health.json 更新，提报告警
