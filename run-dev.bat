@echo off
title Nur Foodes POS Launcher
cd /d "%~dp0"
echo ==============================================
echo   Starting Nur Foodes Restaurant POS App...
echo ==============================================
echo.

set "PATH=%SystemRoot%\system32;%SystemRoot%;C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Node.js/npm detected! Launching dev server...
    call npm.cmd run dev
) else (
    echo Opening application directly in your default browser...
    start "" "%~dp0index.html"
)
pause
