# 飞书通知脚本
# 用法: .\notify.ps1 -Title "标题" -Message "消息内容" [-Level "L1|L2|L3"]
# webhook URL 从 $env:FEISHU_WEBHOOK 读取，或从 escalation/rules.json 的 channel 配置读取

param(
    [Parameter(Mandatory=$true)]
    [string]$Title,
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [ValidateSet("L0","L1","L2","L3")]
    [string]$Level = "L1"
)

$webhookUrl = $env:FEISHU_WEBHOOK
if (-not $webhookUrl) {
    # 尝试从 escalation/rules.json 读
    $rulesFile = Join-Path $PSScriptRoot "..\escalation\rules.json"
    if (Test-Path $rulesFile) {
        $rules = Get-Content $rulesFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $webhookUrl = $rules.channels.feishu_webhook
    }
}

if (-not $webhookUrl) {
    Write-Error "FEISHU_WEBHOOK 未设置。请设置环境变量或在 escalation/rules.json 配置 channels.feishu_webhook"
    exit 1
}

$levelColors = @{
    L0 = "green"
    L1 = "blue"
    L2 = "yellow"
    L3 = "red"
}

$color = $levelColors[$Level]

$body = @{
    msg_type = "interactive"
    card = @{
        header = @{
            title = @{ content = "$Title [$Level]"; tag = "plain_text" }
            template = $color
        }
        elements = @(
            @{
                tag = "markdown"
                content = $Message
            }
            @{
                tag = "note"
                elements = @(
                    @{
                        tag = "plain_text"
                        content = "loop-engine | $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    }
                )
            }
        )
    }
} | ConvertTo-Json -Depth 5 -Compress

try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    if ($result.code -eq 0) {
        Write-Output "通知已发送: $Title [$Level]"
    } else {
        Write-Error "飞书返回错误: $($result.msg)"
        exit 1
    }
} catch {
    Write-Error "发送失败: $($_.Exception.Message)"
    exit 1
}
