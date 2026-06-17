# 批量注册 loop-tasks.json 到 aion-kit
# 用法: .\register.ps1 [tasksFile] [serverUrl]
# 默认: .\register.ps1 loop-tasks.json http://localhost:3099

param(
    [string]$TasksFile = "loop-tasks.json",
    [string]$ServerUrl = "http://localhost:3099"
)

if (-not (Test-Path $TasksFile)) {
    Write-Error "找不到任务文件: $TasksFile"
    exit 1
}

$tasks = Get-Content $TasksFile -Raw -Encoding UTF8 | ConvertFrom-Json

if (-not $tasks.tasks -or $tasks.tasks.Count -eq 0) {
    Write-Error "loop-tasks.json 中没有任务定义"
    exit 1
}

$apiUrl = "$ServerUrl/api/aion/tasks"
$registered = 0
$failed = 0

foreach ($task in $tasks.tasks) {
    $body = $task | ConvertTo-Json -Compress
    try {
        $response = Invoke-WebRequest -Uri $apiUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
        if ($response.StatusCode -eq 201) {
            Write-Output "OK: $($task.name)"
            $registered++
        } else {
            Write-Output "FAIL: $($task.name) — HTTP $($response.StatusCode)"
            $failed++
        }
    } catch {
        Write-Output "FAIL: $($task.name) — $($_.Exception.Message)"
        $failed++
    }
}

Write-Output ""
Write-Output "注册完成: $registered 成功, $failed 失败"
