# 电话线 — 外部连接

Agent 能直接调外部系统，不需要人做中转。

## 模式

wire/ 目录放连接脚本。脚本只管通信协议，不管决策。凭证走环境变量或 `~/.agentboard/` 配置，不进 wire/。

```
wire/
├── notify.ps1     # 飞书/Slack/Telegram 通知
├── deploy.ps1     # 部署到远程
└── git.ps1        # Git 操作封装
```

## 设计原则

1. **脚本只管通信**：通知脚本 = 收消息 + 调 webhook。不做"是不是该通知了"的决策——那是提报组件的职责
2. **凭证不进 wire/**：webhook URL、API key → 环境变量
3. **失败可见**：脚本失败返回非零 exit code，Agent 能读到
4. **幂等安全**：重复调用同一个通知不发两条消息（或标注"重试"）

## 已有参考

| 连接 | 参考实现 |
|------|---------|
| 飞书 webhook | evopearl-data 的飞书提报链路 |
| agentboard API | `~/.agentboard/server.js` — 已有 loop 路由 |
| Slack | 可用 Incoming Webhook app |
