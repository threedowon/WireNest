@echo off
setlocal
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 launch.py
  goto done
)
python --version >nul 2>&1
if not errorlevel 1 (
  python launch.py
  goto done
)
echo Python 3 is required. Install it from https://www.python.org/downloads/
echo Enable "Add Python to PATH" during installation, then run start.cmd again.
:done
pause
