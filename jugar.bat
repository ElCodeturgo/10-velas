@echo off
echo ===============================
echo   INICIANDO TEN CANDLES
echo ===============================
echo Configurando permisos de red para Ollama...
set OLLAMA_ORIGINS="*"
echo.
echo Iniciando servidor en el puerto 8000...
start "" http://localhost:8000/
python -m http.server 8000
