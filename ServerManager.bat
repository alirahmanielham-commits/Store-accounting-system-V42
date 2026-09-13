@echo off
chcp 65001 >nul
title پنل مدیریت سرور - AI Studio
color 0B

:MENU
cls
echo =======================================================
echo.
echo       *** پنل مدیریت سرور (نسخه خط فرمان ویندوز) ***
echo.
echo =======================================================
echo.
echo   [1] راه اندازی سرور (Start Server)
echo   [2] توقف سرور (Stop Server)
echo   [3] راه اندازی مجدد سرور (Restart Server)
echo   [4] بروزرسانی از گیت هاب (Git Pull)
echo   [5] نصب نیازمندی ها (npm install)
echo   [0] خروج
echo.
echo =======================================================
set /p choice="یک گزینه را انتخاب کنید (0-5): "

if "%choice%"=="1" goto START_SERVER
if "%choice%"=="2" goto STOP_SERVER
if "%choice%"=="3" goto RESTART_SERVER
if "%choice%"=="4" goto GIT_PULL
if "%choice%"=="5" goto NPM_INSTALL
if "%choice%"=="0" goto EXIT

goto MENU

:START_SERVER
echo در حال اجرای سرور...
start "AI Studio Dev Server" cmd /k "title Dev Server & color 0A & npm run dev -- --host"
echo سرور در پنجره جدید باز شد.
pause
goto MENU

:STOP_SERVER
echo در حال متوقف کردن پروسه های روی پورت 3000...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
  taskkill /f /pid %%T >nul 2>&1
)
echo سرور با موفقیت متوقف شد.
pause
goto MENU

:RESTART_SERVER
echo در حال توقف سرور قدیمی...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
  taskkill /f /pid %%T >nul 2>&1
)
echo در حال اجرای مجدد سرور...
start "AI Studio Dev Server" cmd /k "title Dev Server & color 0A & npm run dev -- --host"
echo سرور مجدداً راه‌اندازی شد.
pause
goto MENU

:GIT_PULL
echo در حال دریافت آخرین تغییرات از گیت‌هاب...
git pull
echo.
echo عملیات به پایان رسید.
pause
goto MENU

:NPM_INSTALL
echo در حال نصب نیازمندی‌ها...
npm install
echo.
echo عملیات به پایان رسید.
pause
goto MENU

:EXIT
exit
