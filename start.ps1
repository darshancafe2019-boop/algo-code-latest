# Quant.OS Unified System Launcher (PowerShell)
# Uses project virtual environment to prevent Windows Store Python alias errors.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$VenvPython = Join-Path $ScriptDir ".venv\Scripts\python.exe"
$Orchestrator = Join-Path $ScriptDir "scripts\dev_orchestrator.py"

if (-not (Test-Path $VenvPython)) {
    Write-Host "[ERROR] Virtual environment Python not found at: $VenvPython" -ForegroundColor Red
    Write-Host "Please ensure the .venv folder exists."
    exit 1
}

Write-Host "[Quant.OS] Starting Unified Supervisor and Platform Services..." -ForegroundColor Cyan
& $VenvPython $Orchestrator $args
