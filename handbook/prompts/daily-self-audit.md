# 每日自检 Prompt

> Agent 每日执行的标准化自检指令。配合 alarm/loop-tasks.json 使用。

---

根据 `CLAUDE.md` 执行每日自检，检查本项目的 Loop Engineering 8 组件健康状态。

## 任务步骤

### 1. 读状态
- 读 `notebook/health.json`，了解上次运行时间和当前评分
- 读 `notebook/events.jsonl` 最近 10 条事件

### 2. 验证组件
按 CLAUDE.md 的 8 组件逐一检查：

| 组件 | 检查项 |
|------|--------|
| 闹钟 | 定时任务是否注册？上次触发时间是否在预期窗口内？ |
| 工位 | 如有并行任务，worktree 是否存在且干净？ |
| 知识管理 | CLAUDE.md 是否 < 200 行？handbook/ 文档是否不过期？ |
| 电话线 | 外部 API 凭证是否有效？通知脚本是否可执行？ |
| 质检员 | 上次验证是否通过？验证条件是否仍有效（未被绕过）？ |
| 记事本 | health.json 和 events.jsonl 是否在正常更新？ |
| 提报 | 如果有待提报的异常，是否已推送？ |
| 目标定义 | 完成标准是否仍可机器验证？边界条件是否需要更新？ |

### 3. 更新 health.json
对每个组件评分（3=正常, 2=警告, 1=异常, 0=缺失），更新 `today` 字段。

### 4. 判断是否提报
参考 `escalation/rules.json`：
- 有组件降级到 1 → L2 提报
- 有组件降到 0 → L3 阻断
- 连续 2 天同一组件警告 → L2 提报

### 5. 写事件日志
追加一条到 `notebook/events.jsonl`：
```json
{"ts":"<ISO8601>","event":"daily-self-audit","detail":{"score":X.X,"alerts":N,"changed":["组件名"]}}
```

## 完成标准
- [ ] health.json 的 updated 字段已更新为今天
- [ ] 所有组件评分有证据支撑（不是估的）
- [ ] 需要提报的已调 wire/notify.ps1
- [ ] events.jsonl 已追加
