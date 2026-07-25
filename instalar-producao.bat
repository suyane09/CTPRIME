@echo off
REM ============================================================
REM  CT Prime - Instalacao de PRODUCAO (rodar UMA VEZ so)
REM  Use isto DEPOIS de ja ter registrado um dominio e
REM  adicionado ele na sua conta Cloudflare.
REM
REM  Rode este arquivo clicando com o botao direito
REM  e escolhendo "Executar como administrador".
REM ============================================================

cd /d "%~dp0"

echo.
echo ====== ETAPA 1: Instalar PM2 e o plugin de inicializacao ======
call npm install -g pm2
call npm install -g pm2-windows-startup
call pm2-startup install

echo.
echo ====== ETAPA 2: Subir o servidor com PM2 ======
call pm2 start ecosystem.config.js
call pm2 save

echo.
echo ====== ETAPA 3: Login no Cloudflare (vai abrir o navegador) ======
echo Escolha o dominio que voce registrou quando o navegador abrir.
pause
call cloudflared tunnel login

echo.
echo ====== ETAPA 4: Criar o tunel nomeado "ctprime" ======
call cloudflared tunnel create ctprime

echo.
echo ====== ETAPA 5: Configuracao manual necessaria ======
echo.
echo Copie o "ID do tunel" que apareceu acima.
echo Agora abra o arquivo:
echo   %USERPROFILE%\.cloudflared\config.yml
echo (ou copie cloudflared-config.example.yml pra la e renomeie)
echo.
echo Preencha o ID do tunel e o dominio (ex: app.seudominio.com)
echo dentro desse config.yml antes de continuar.
echo.
pause

echo.
echo ====== ETAPA 6: Apontar o DNS pro tunel ======
set /p DOMINIO="Digite o dominio/subdominio que voce configurou no config.yml (ex: app.seudominio.com): "
call cloudflared tunnel route dns ctprime %DOMINIO%

echo.
echo ====== ETAPA 7: Instalar o tunel como servico do Windows ======
call cloudflared service install

echo.
echo ============================================================
echo  PRONTO! Agora confira:
echo  1) No arquivo .env, ALLOWED_ORIGINS deve incluir: https://%DOMINIO%
echo  2) Reinicie o servidor: pm2 restart ctprime-api
echo  3) Teste acessando https://%DOMINIO%/cardapio.html de fora da rede
echo ============================================================
echo.
pause
