param(
  [Parameter(Mandatory=$true)][string]$EnvFile,
  [ValidateSet('User', 'Machine', 'Process')][string]$Scope = 'User'
)

if (-not (Test-Path $EnvFile)) {
  Write-Error "Env file not found: $EnvFile"
  exit 1
}

$count = 0
Get-Content $EnvFile | ForEach-Object {
  if ($_ -match '^export\s+([A-Z_][A-Z0-9_]*)="(.*)"$') {
    $name = $matches[1]
    $value = $matches[2]
    [Environment]::SetEnvironmentVariable($name, $value, $Scope)
    Write-Host "  set $name"
    $count++
  }
}

Write-Host ""
Write-Host "Set $count environment variables at $Scope scope."
Write-Host "Restart OpenCode and any shells that need these values."
