@echo off
cd /d "%~dp0"
echo Creating monitor directory structure...

mkdir src\monitor 2>nul
mkdir src\monitor\dto 2>nul
mkdir src\monitor\entities 2>nul

echo Directories created successfully!
echo.
echo Verifying structure:
dir src\monitor /s /ad /b

pause
