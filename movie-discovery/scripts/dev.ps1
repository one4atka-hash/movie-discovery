# Запуск dev-сервера из movie-discovery с проверкой порта (Windows).
# Использование: из папки movie-discovery — .\scripts\dev.ps1
# Или: npm run dev:win

param(
  [int]$Port = 4200,
  [string]$HostName = '127.0.0.1'
)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
Set-Location $appRoot

$probe = Test-NetConnection -ComputerName $HostName -Port $Port -WarningAction SilentlyContinue
if ($probe.TcpTestSucceeded) {
  Write-Error "Порт $Port на $HostName уже занят. Остановите процесс или укажите другой: .\scripts\dev.ps1 -Port 4300"
  exit 1
}

npm start -- --port $Port --host $HostName
