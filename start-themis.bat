@echo off
title Themis Launcher
echo ======================================================
echo           THEMIS DIGITAL LEGAL AID LAUNCHER
echo ======================================================
echo.

:: Add Visual Studio NodeJs path to PATH if it exists
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs" (
    set "PATH=C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;%PATH%"
)

:: Verify Node.js is accessible
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in standard paths or Visual Studio path.
    echo Please verify your Node.js installation.
    pause
    exit /b 1
)

echo [INFO] Node.js verified successfully.
echo.
echo [STEP 1/2] Syncing Database Schema (db:push)...
echo ------------------------------------------------------
cd backend
call npm run db:push
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] db:push failed. This usually means PostgreSQL is not running
    echo           or the database 'themis' has not been created yet.
    echo           Please check your database connection or .env settings.
    echo.
    set /p choice="Do you want to try starting the frontend and backend anyway? (y/n): "
    if /i "%choice%" neq "y" (
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo.
echo [STEP 2/2] Starting Frontend and Backend servers...
echo ------------------------------------------------------
echo Themis will be available at: http://localhost:3000
echo.
npm run dev
pause
