@echo off
setlocal

echo [gen-all] Starting full generation pipeline...
echo.

echo [gen-all] Step 1/3: gen-data
node "%~dp0gen-data.js"
if %ERRORLEVEL% neq 0 (
    echo [gen-all] FAILED at gen-data. Aborting.
    exit /b %ERRORLEVEL%
)

echo.
echo [gen-all] Step 2/3: gen-packets
node "%~dp0gen-packets.js"
if %ERRORLEVEL% neq 0 (
    echo [gen-all] FAILED at gen-packets. Aborting.
    exit /b %ERRORLEVEL%
)

echo.
echo [gen-all] Step 3/3: gen-orm
node "%~dp0gen-orm.js"
if %ERRORLEVEL% neq 0 (
    echo [gen-all] FAILED at gen-orm. Aborting.
    exit /b %ERRORLEVEL%
)

echo.
echo [gen-all] All steps completed successfully.
endlocal
