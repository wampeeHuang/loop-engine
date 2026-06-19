# loop-engine — 运维手册

> 快速排障和操作命令速查。

## 常用命令

```powershell
# 手动触发一次任务
claude -p "根据 CLAUDE.md 执行 [任务名]"

# 查看健康状态
cat notebook/health.json

# 查看最近事件
Get-Content notebook/events.jsonl -Tail 20

# 注册/更新闹钟
cd alarm
.\register.ps1           # 注册到 aion-kit
.\scheduler.ps1          # 注册到 Windows 任务计划器

# 查看 Windows 定时任务
schtasks /query /tn "loop-*"
```

## 常见故障

| 故障 | 检查 | 修复 |
|------|------|------|
| 任务没触发 | `schtasks /query` 或 aion-kit `:3099/api/aion/tasks` | 检查 cron 表达式是否正确 |
| Agent 执行失败 | `notebook/events.jsonl` 最新条目 | 看 prompt 是否有效，项目路径是否正确 |
| 产出数据过期 | `health.json` 的 today.last_run 时间 | 手动触发一次 |
| 健康分下降 | `health.json` 各组件评分 | 按审计报告的差距矩阵补组件 |

## 恢复步骤

### 完全重启

1. 检查 CLAUDE.md 没有被意外修改
2. 读 `notebook/health.json` 了解当前状态
3. 手动跑一次核心任务验证功能
4. 确认闹钟注册状态
5. 跑一次 `loop-audit` 更新健康评分

### 数据库损坏（aion-kit）

```powershell
# aion-kit 在 :3099，数据库在 aion.db
# 导出备份
node scripts/db-migrate.js export > backup.json
# 或直接从 SQLite 恢复
```

## 日志位置

| 日志 | 路径 | 用途 |
|------|------|------|
| 健康状态 | `notebook/health.json` | 结构化自评 |
| 事件日志 | `notebook/events.jsonl` | 每次运行的审计追踪 |
| 审计报告 | `LOOP_AUDIT.md` | loop-audit 产出 |
| 初始化日志 | `_runtime/init-log.jsonl` | 初始化记录 |
