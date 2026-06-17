# 工位 — 隔离

并行任务不相互覆盖。串行执行是天然隔离但不是工位——工位的目的是**安全并行**。

## 何时需要工位

| 场景 | 隔离方式 |
|------|---------|
| 串行执行（单任务） | 无需工位，天然隔离 |
| 并行任务 ≤ 2 | git worktree 或独立 clone |
| 并行任务 > 2 | git worktree + 互斥锁 |

## git worktree 操作

```bash
# 创建独立工位
git worktree add ../project-task-1 feature/task-1

# 查看所有工位
git worktree list

# 任务完成后清理
git worktree remove ../project-task-1 --force
```

## 设计原则

1. **串行优先**：能串行不并行。并行增加复杂度，收益只在"一个任务阻塞另一个等不起"时才值
2. **互斥锁**：如果并行，共享资源（如 SQLite、同一输出目录）必须有锁。aion-kit 的 cron 解析器有去重，不会同一分钟跑两次同一任务
3. **工位不跨盘**：worktree 在同一个文件系统上创建，不跨盘
