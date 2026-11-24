@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js 22.13 or later is required. Install Node.js LTS from https://nodejs.org
 pause
 exit /b 1
)
node scripts/check-node.cjs
if errorlevel 1 (
 pause
 exit /b 1
)
set PORT=33000
set AX_OPEN_BROWSER=1
echo The browser opens after the server is ready.
echo If it does not open, visit http://127.0.0.1:33000/#chat
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
pause
