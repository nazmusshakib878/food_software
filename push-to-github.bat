@echo off
title Push to GitHub - Food Software
cd /d "%~dp0"
echo ===================================================
echo   Uploading Food Software to GitHub
echo   Repository: https://github.com/nazmusshakib878/food_software
echo ===================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================
    echo   SUCCESS! Uploaded successfully to GitHub.
    echo ===================================================
) else (
    echo ===================================================
    echo   Upload failed. Check your GitHub permissions or token.
    echo ===================================================
)
echo.
pause
