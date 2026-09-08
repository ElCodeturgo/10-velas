@echo off
echo ===============================
echo   TEN CANDLES - Iniciando...
echo ===============================
echo.
echo Iniciando servidor local en http://localhost:8080
echo Presiona Ctrl+C para detener el servidor.
echo.

start "" http://localhost:8080
python -m http.server 8080
