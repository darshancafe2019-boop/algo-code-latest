@echo off
REM ==============================================================================
REM Cross-Platform Sync Helper for algo-code-latest (Windows CMD / Batch)
REM Synchronizes changes between Desktop and Mac via GitHub
REM ==============================================================================

cd /d "%~dp0\.."

echo ===================================================
echo   Syncing algo-code-latest with GitHub
echo ===================================================

echo.
echo [1/3] Fetching and pulling latest changes from GitHub...
git pull --rebase origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git pull encountered an issue. Please check your working directory.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Checking for local modifications...
git status --porcelain > "%TEMP%\git_status.tmp"
set /p STATUS=<"%TEMP%\git_status.tmp"
del "%TEMP%\git_status.tmp" 2>nul

if not "%STATUS%"=="" (
    echo [INFO] Local changes detected. Staging and committing...
    git add -A
    git commit -m "sync: updates from Windows Desktop (%DATE% %TIME%)"
)

echo.
echo [3/3] Pushing latest changes to GitHub...
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git push encountered an issue.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   Synchronization complete!
echo ===================================================
pause
