# Run Flow API and Web locally. Requires GITHUB_TOKEN.
$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) {
  Write-Host "Error: GITHUB_TOKEN environment variable is required. Set it with a PAT that has GitHub Models (models: read) access."
  exit 1
}

$Root = $PSScriptRoot
Set-Location $Root

# Ensure flow-web dependencies
if (-not (Test-Path "flow-web\node_modules")) {
  Write-Host "Installing flow-web dependencies..."
  Set-Location flow-web
  npm install
  Set-Location $Root
}

$apiProcess = $null
$webProcess = $null

function Stop-ChildProcesses {
  if ($apiProcess -and -not $apiProcess.HasExited) {
    Stop-Process -Id $apiProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($webProcess -and -not $webProcess.HasExited) {
    Stop-Process -Id $webProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

try {
  Write-Host "Starting flow-api on http://localhost:5180 ..."
  $apiProcess = Start-Process -FilePath "dotnet" -ArgumentList "run", "--project", "flow-api" -WorkingDirectory $Root -PassThru -NoNewWindow

  Start-Sleep -Seconds 2

  Write-Host "Starting flow-web on http://localhost:5173 ..."
  $webProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm", "run", "dev" -WorkingDirectory (Join-Path $Root "flow-web") -PassThru -NoNewWindow

  Write-Host "Flow is running. API: http://localhost:5180  Web: http://localhost:5173"
  Write-Host "Press Ctrl+C to stop both."
  Wait-Process -Id $apiProcess.Id, $webProcess.Id -ErrorAction SilentlyContinue
}
finally {
  Write-Host "Shutting down..."
  Stop-ChildProcesses
}
