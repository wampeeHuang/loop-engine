# 部署脚本模板
# 用法: .\deploy.ps1 [-Target "production|staging"]
# 替换为项目实际的部署逻辑。
# 参考: evopearl-data 的 git push → Vercel 自动部署链

param(
    [ValidateSet("production","staging")]
    [string]$Target = "production"
)

$projectDir = Split-Path -Parent $PSScriptRoot

Write-Output "[deploy] 目标: $Target"
Write-Output "[deploy] 项目: $projectDir"

# === 以下替换为实际部署逻辑 ===

# 示例: git push 触发部署
# git -C $projectDir add -A
# git -C $projectDir commit -m "auto: deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
# git -C $projectDir push

# 示例: 复制产出到目标服务器
# scp "$projectDir\data\*" user@server:/var/www/output/

# 示例: 调 Vercel deploy hook
# Invoke-WebRequest -Uri $env:VERCEL_DEPLOY_HOOK -Method POST

Write-Output "[deploy] 完成"
