$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$logDir = Join-Path $projectRoot 'logs'
$logFile = Join-Path $logDir 'tdd-run.log'

$stdin = [Console]::In.ReadToEnd()
try {
    $payload = $stdin | ConvertFrom-Json
} catch {
    exit 0
}

$filePath = $payload.tool_input.file_path
if (-not $filePath) { $filePath = $payload.tool_response.filePath }
if (-not $filePath) { exit 0 }

$normalized = $filePath -replace '\\', '/'
if ($normalized -notmatch '/(src|tests)/.*\.ts$') {
    exit 0
}

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
Add-Content -Path $logFile -Value "===== $timestamp | changed: $filePath ====="

Push-Location $projectRoot
try {
    $output = & npm test 2>&1
    $output | Out-String | Add-Content -Path $logFile
} finally {
    Pop-Location
}

Add-Content -Path $logFile -Value ""
exit 0
