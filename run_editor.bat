@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Lumi Motion

if not exist "app.py" (
    echo [ERRO] app.py nao encontrado em:
    echo %CD%
    goto :fail
)

set "LUMI_PYTHON="
set "LUMI_BOOTSTRAP="

if exist ".venv\Scripts\python.exe" set "LUMI_PYTHON=.venv\Scripts\python.exe"

if not defined LUMI_PYTHON (
    where py.exe >nul 2>&1
    if not errorlevel 1 set "LUMI_BOOTSTRAP=py -3"
)
if not defined LUMI_PYTHON if not defined LUMI_BOOTSTRAP (
    where python.exe >nul 2>&1
    if not errorlevel 1 set "LUMI_BOOTSTRAP=python"
)
if not defined LUMI_PYTHON if not defined LUMI_BOOTSTRAP (
    where python3.exe >nul 2>&1
    if not errorlevel 1 set "LUMI_BOOTSTRAP=python3"
)

if not defined LUMI_PYTHON if not defined LUMI_BOOTSTRAP (
    echo [ERRO] Python 3 nao foi encontrado.
    echo Instale Python 3.11 ou mais recente e marque "Add Python to PATH":
    echo https://www.python.org/downloads/windows/
    echo Depois execute este arquivo novamente.
    goto :fail
)

if not defined LUMI_PYTHON (
    echo [Lumi Motion] Criando ambiente Python local...
    %LUMI_BOOTSTRAP% -m venv ".venv"
    if errorlevel 1 (
        echo [ERRO] Nao foi possivel criar .venv.
        goto :fail
    )
    set "LUMI_PYTHON=.venv\Scripts\python.exe"
)

"%LUMI_PYTHON%" -c "import PyQt6; import PyQt6.QtWebEngineWidgets" >nul 2>&1
if errorlevel 1 (
    echo [Lumi Motion] Instalando dependencias. Primeira execucao pode demorar...
    "%LUMI_PYTHON%" -m pip install -r "requirements.txt"
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        goto :fail
    )
)

set "PYTHONUTF8=1"
echo [Lumi Motion] Abrindo editor...
"%LUMI_PYTHON%" "app.py"
if errorlevel 1 (
    echo.
    echo [ERRO] Editor terminou com falha. Mensagem acima mostra causa.
    goto :fail
)
exit /b 0

:fail
echo.
pause
exit /b 1
