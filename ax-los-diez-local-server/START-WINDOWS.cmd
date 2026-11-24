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
echo Open http://localhost:33000 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node server.mjs
pause
