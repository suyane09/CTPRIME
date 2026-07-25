@echo off
REM ============================================================
REM  CT Prime - Modo TESTE (link temporario, sem dominio ainda)
REM  Sobe o servidor local + gera um link publico temporario.
REM  A URL muda toda vez que voce roda este script de novo.
REM ============================================================

cd /d "%~dp0"

echo.
echo [1/2] Iniciando servidor CT Prime...
start "CT Prime - Servidor" cmd /k "npm start"

timeout /t 5 /nobreak >nul

echo.
echo [2/2] Abrindo tunel publico temporario (Cloudflare)...
echo       A URL vai aparecer na janela que vai abrir agora.
echo       Copie exatamente a URL que aparecer ali - ela muda toda vez.
echo.
start "CT Prime - Tunel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo ============================================================
echo  Duas janelas foram abertas: Servidor e Tunel.
echo  NAO FECHE nenhuma das duas enquanto estiver usando o sistema.
echo  A URL publica vai aparecer na janela "CT Prime - Tunel".
echo ============================================================
echo.
pause
