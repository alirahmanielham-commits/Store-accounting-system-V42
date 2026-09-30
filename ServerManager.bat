@echo off
chcp 65001 >nul
title پنل مدیریت سرور حسابداری - Professional Server Manager
color 0B

:MENU
cls
echo ======================================================================
echo.
echo           *** پنل مدیریت سرور حسابداری (نسخه کنسول ویندوز) ***
echo.
echo ======================================================================
echo.
echo   [1] راه اندازی سرور توسعه (Start Dev Server)
echo   [2] راه اندازی سرور نهایی (Start Production Server)
echo   [3] توقف کامل سرور و آزادسازی پورت ۳۰۰۰ (Stop Server)
echo   [4] راه اندازی مجدد سرور (Restart Server)
echo   [5] باز کردن برنامه در مرورگر (Open in Browser)
echo   [6] اجرای پنل گرافیکی ویندوز (Launch ServerPanel.hta)
echo   [7] ایجاد نسخه پشتیبان دستی سریع (Quick Backup)
echo   [8] دریافت بروزرسانی ها از گیت هاب (Git Pull)
echo   [9] نصب و بروزرسانی پیش نیازها (npm install)
echo   [10] ساخت بسته نهایی پروژه (npm run build)
echo   [0] خروج از برنامه
echo.
echo ======================================================================
set /p choice="لطفاً شماره گزینه مورد نظر را وارد نمایید (0-10): "

if "%choice%"=="1" goto START_DEV
if "%choice%"=="2" goto START_PROD
if "%choice%"=="3" goto STOP_SERVER
if "%choice%"=="4" goto RESTART_SERVER
if "%choice%"=="5" goto OPEN_BROWSER
if "%choice%"=="6" goto LAUNCH_HTA
if "%choice%"=="7" goto QUICK_BACKUP
if "%choice%"=="8" goto GIT_PULL
if "%choice%"=="9" goto NPM_INSTALL
if "%choice%"=="10" goto NPM_BUILD
if "%choice%"=="0" goto EXIT

goto MENU

:START_DEV
echo.
echo در حال اجرای سرور در حالت توسعه (Dev Mode)...
start "Accounting Dev Server" cmd /k "title Accounting Dev Server & color 0A & npm run dev"
echo سرور با موفقیت در پنجره مجزا فراخوانی شد.
timeout /t 3 >nul
start http://localhost:3000
pause
goto MENU

:START_PROD
echo.
echo در حال اجرای سرور در حالت تولید (Production Mode)...
start "Accounting Production Server" cmd /k "title Accounting Production Server & color 0B & npm start"
echo سرور با موفقیت اجرا گردید.
timeout /t 3 >nul
start http://localhost:3000
pause
goto MENU

:STOP_SERVER
echo.
echo در حال متوقف کردن کلیه پروسه ها روی پورت 3000...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
  taskkill /F /T /PID %%T >nul 2>&1
)
echo تمامی پروسه های متصل به پورت ۳۰۰۰ با موفقیت بسته شدند.
pause
goto MENU

:RESTART_SERVER
echo.
echo در حال توقف پروسه های قبلی...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3000') DO (
  taskkill /F /T /PID %%T >nul 2>&1
)
timeout /t 2 >nul
echo در حال راه اندازی مجدد...
start "Accounting Dev Server" cmd /k "title Accounting Dev Server & color 0A & npm run dev"
echo سرور مجدداً راه اندازی گردید.
pause
goto MENU

:OPEN_BROWSER
echo.
echo در حال باز کردن آدرس برنامه در مرورگر پیش فرض...
start http://localhost:3000
goto MENU

:LAUNCH_HTA
echo.
echo در حال اجرای پنل گرافیکی ServerPanel.hta...
start ServerPanel.hta
goto MENU

:QUICK_BACKUP
echo.
echo در حال تهیه نسخه پشتیبان...
set STAMP=%date:~10,4%-%date:~4,2%-%date:~7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%
set STAMP=%STAMP: =0%
set BKP_DIR=my_backups\backup-cmd-%STAMP%
mkdir "%BKP_DIR%" 2>nul
if exist database.json copy database.json "%BKP_DIR%\" >nul 2>&1
if exist db_config.json copy db_config.json "%BKP_DIR%\" >nul 2>&1
if exist .env copy .env "%BKP_DIR%\.env.bak" >nul 2>&1
echo نسخه پشتیبان با موفقیت در پوشه زیر ذخیره شد:
echo %BKP_DIR%
pause
goto MENU

:GIT_PULL
echo.
echo در حال دریافت آخرین تغییرات از گیت هاب...
git pull
echo عملیات به پایان رسید.
pause
goto MENU

:NPM_INSTALL
echo.
echo در حال نصب کتابخانه ها و پیش نیازها...
npm install
echo عملیات به پایان رسید.
pause
goto MENU

:NPM_BUILD
echo.
echo در حال بیلد و بهینه سازی پروژه...
npm run build
echo عملیات بیلد تکمیل شد.
pause
goto MENU

:EXIT
exit
