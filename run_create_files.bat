@echo off
REM Create directories
mkdir "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\types" 2>nul
mkdir "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\api" 2>nul

REM Run the Python script
cd /d "C:\Users\Ni0daunn\Desktop\work\EzMonitor"
python create_files_direct.py

REM Verify files were created
echo.
echo Verifying files...
if exist "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\types\api.ts" (
    echo ✓ types/api.ts created
) else (
    echo ✗ types/api.ts NOT found
)

if exist "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\api\client.ts" (
    echo ✓ api/client.ts created
) else (
    echo ✗ api/client.ts NOT found
)

if exist "C:\Users\Ni0daunn\Desktop\work\EzMonitor\app\monitor-app\src\api\index.ts" (
    echo ✓ api/index.ts created
) else (
    echo ✗ api/index.ts NOT found
)

pause
