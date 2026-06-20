# 零依赖闹钟：读 loop-tasks.json，用 schtasks.exe 创建 Windows 定时任务
# 用法: .\scheduler.ps1 [tasksFile]
# 需要管理员权限才能创建系统级任务。普通用户创建当前用户任务。
# 默认: .\scheduler.ps1 loop-tasks.json

param(
    [string]$TasksFile = "loop-tasks.json"
)

if (-not (Test-Path $TasksFile)) {
    Write-Error "找不到任务文件: $TasksFile"
    exit 1
}

$tasks = Get-Content $TasksFile -Raw -Encoding UTF8 | ConvertFrom-Json
$projectDir = (Get-Location).Path
$taskNamePrefix = "loop-engine"

# 解析 cron 表达式为 schtasks /sc 参数
function Parse-CronToSchtasks($cron) {
    $parts = $cron -split ' '
    $minute = $parts[0]
    $hour = $parts[1]
    $dom = $parts[2]
    $month = $parts[3]
    $dow = $parts[4]

    $startTime = "{0:D2}:{1:D2}" -f [int]$hour, [int]$minute

    if ($dow -eq '*') {
        if ($dom -eq '*') {
            return @{ sc = 'DAILY'; st = $startTime }
        }
    }
    if ($dow -ne '*') {
        return @{ sc = 'WEEKLY'; st = $startTime; d = $dow }
    }
    if ($dom -ne '*') {
        return @{ sc = 'MONTHLY'; st = $startTime; d = $dom }
    }
    return @{ sc = 'DAILY'; st = $startTime }
}

$created = 0
$failed = 0

foreach ($task in $tasks.tasks) {
    if (-not $task.enabled) {
        Write-Output "SKIP: $($task.name) (disabled)"
        continue
    }

    $schedule = Parse-CronToSchtasks $task.cron_expr
    $taskName = "$taskNamePrefix-$($task.name)"
    $claudeCmd = "claude -p -- `"$($task.prompt)`""

    # 先删旧任务（如果存在）
    schtasks /delete /tn $taskName /f 2>$null | Out-Null

    # 创建新任务
    $argList = @(
        '/create', '/tn', $taskName,
        '/tr', "cmd /d /c cd /d `"$($task.project_dir)`" && $claudeCmd",
        '/sc', $schedule.sc,
        '/st', $schedule.st
    )
    if ($schedule.d) {
        $argList += '/d', $schedule.d
    }

    $result = schtasks @argList 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Output "OK: $($task.name) — $($schedule.sc) $($schedule.st)"
        $created++
    } else {
        Write-Output "FAIL: $($task.name) — $result"
        $failed++
    }
}

Write-Output ""
Write-Output "创建完成: $created 成功, $failed 失败"
Write-Output "管理: taskschd.msc 或 schtasks /query /tn `"$taskNamePrefix-*`""
