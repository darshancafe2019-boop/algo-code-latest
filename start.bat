@echo off
REM Quant.OS Unified System Launcher
REM Uses project virtual environment to prevent Windows Store Python alias errors.

set "SCRIPT_DIR=%~dp0"
set "VENV_PY=%SCRIPT_DIR%.venv\Scripts\python.exe"

if not exist "%VENV_PY%" (
    echo [ERROR] Virtual environment Python not found at: %VENV_PY%
    echo Please ensure the .venv folder exists.
    pause
    exit /b 1
)

echo [Quant.OS] Starting Unified Supervisor and Platform Services...
"%VENV_PY%" "%SCRIPT_DIR%scripts\dev_orchestrator.py" %*
