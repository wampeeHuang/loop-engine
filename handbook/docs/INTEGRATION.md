# {{PROJECT_NAME}} — 接入指南

> 外部系统（人或其他 Agent）怎么用这个项目的产出。

## 产出格式

| 产出 | 格式 | 路径 | 更新频率 |
|------|------|------|---------|
| [产出名称] | JSON/Markdown/CSV | `data/xxx.json` | 每天 1 次 |

## 访问方式

### 本地文件

直接读 `data/` 目录下的文件。

### API（如有）

如果有 HTTP 接口：
- 地址: `http://localhost:PORT/api/xxx`
- 方法: GET
- 返回: JSON

## 限流与约束

- [ ] 不要在同一分钟重复调用
- [ ] 大文件读取加超时
- [ ] [其他约束]

## 故障排查

| 现象 | 可能原因 | 检查方法 |
|------|---------|---------|
| 产出文件不存在 | job 未执行 | 查 `notebook/health.json` 的 today.last_run |
| 数据为空 | 源无更新 | 查 `notebook/events.jsonl` 最近日志 |
