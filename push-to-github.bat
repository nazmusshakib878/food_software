@echo off
setlocal
title Push current branch to GitHub - Nur Food POS
cd /d "%~dp0"
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo Error: this folder is not inside a Git repository.
    goto end
)

for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"
if not defined CURRENT_BRANCH (
    echo Error: no branch is checked out. Check out a branch before pushing.
    goto end
)

echo ===================================================
echo   Pushing branch: %CURRENT_BRANCH%
echo   Remote: origin
echo ===================================================
echo.
git push -u origin HEAD
echo.
if %ERRORLEVEL% equ 0 (
    echo ===================================================
    echo   Push completed successfully.
    echo ===================================================
) else (
    echo ===================================================
    echo   Push failed. Review the Git output above.
    echo ===================================================
)

:end
echo.
pause
endlocal
