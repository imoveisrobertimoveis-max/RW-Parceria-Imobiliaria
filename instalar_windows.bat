
@echo off
setlocal
title INSTALADOR PARTNERHUB - REPARO E INICIALIZACAO

:: Cores: Fundo Preto, Texto Branco
color 0F

echo ............................................................
echo           PARTNERHUB CRM PRO - MODO DE SEGURANCA
echo ............................................................
echo.
echo Tentando iniciar o sistema... Por favor, aguarde.
echo.

:: 1. VERIFICAR NODE.JS
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O Node.js nao foi encontrado.
    echo Abrindo site de download para voce...
    start https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi
    echo.
    echo APOS INSTALAR E REINICIAR O PC, ABRA ESTE ARQUIVO NOVAMENTE.
    pause
    exit /b
)

:: 2. LIMPEZA DE SEGURANCA (Se a instalacao anterior falhou)
if not exist "node_modules" (
    echo [INFO] Primeira instalacao detectada. Baixando componentes...
    echo (Isso pode demorar de 2 a 5 minutos dependendo da sua internet)
    call npm install --no-audit --no-fund
)

:: 3. TENTAR INICIAR COMO PROGRAMA (ELECTRON)
echo [INFO] Tentando abrir como Aplicativo de Desktop...
call npm start > nul 2>&1

:: 4. SE O PROGRAMA FALHAR, TENTAR ABRIR NO NAVEGADOR (FALLBACK)
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo [AVISO] Nao foi possivel abrir como programa nativo.
    echo Tentando abrir agora no seu NAVEGADOR (Chrome/Edge)...
    echo.
    :: Simula um servidor simples ou usa o modo web
    start http://localhost:3000
    call npx vite --port 3000 --open
)

:: 5. SE TUDO FALHAR, MOSTRAR O ERRO REAL
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ............................................................
    echo   ERRO CRITICO DETECTADO
    echo ............................................................
    echo 1. Verifique se voce extraiu TODOS os arquivos do ZIP.
    echo 2. Verifique se o seu Antivirus nao apagou o arquivo 'npm'.
    echo 3. Tente rodar: npm install denovo manualmente.
    echo ............................................................
    echo.
    pause
)

pause
