@echo off
setlocal
cd /d "%~dp0"
where pnpm >nul 2>&1
if not errorlevel 1 (
  if not exist node_modules call pnpm install --frozen-lockfile
  call pnpm dev
  exit /b
)
set "BASTION_PNPM=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd"
if exist "%BASTION_PNPM%" (
  if not exist node_modules call "%BASTION_PNPM%" install --frozen-lockfile
  call "%BASTION_PNPM%" dev
  exit /b
)
echo Install Node.js 24 and pnpm 11, then run this file again.
echo See README.md for setup instructions.
pause
