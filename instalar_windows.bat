
@echo off
setlocal
title Instalador PartnerHub CRM PRO - Diagnostico

:: Cores
color 0F

echo ==========================================================
echo    PARTNERHUB CRM PRO - INSTALADOR PARA WINDOWS
echo ==========================================================
echo.
echo Este script ira configurar o ambiente e abrir o CRM.
echo.

:: 1. Verificar Node.js
echo [1/3] Verificando motor do sistema (Node.js)...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ----------------------------------------------------------
    echo ERRO CRITICO: O Node.js nao foi encontrado no Windows!
    echo ----------------------------------------------------------
    echo O 'Caminho' para funcionar e:
    echo 1. Baixe o instalador em: https://nodejs.org/
    echo 2. Instale com todas as opcoes padrao marcadas.
    echo 3. Reinicie seu computador.
    echo 4. Tente abrir este arquivo (.bat) novamente.
    echo.
    pause
    exit /b
)

:: 2. Instalar dependências se necessário
echo [2/3] Sincronizando bibliotecas do CRM...
if not exist "node_modules" (
    echo Instalando componentes iniciais...
    call npm install --no-audit
) else (
    echo Componentes ja instalados.
)

:: 3. Iniciar
echo.
echo [3/3] Iniciando o PartnerHub CRM...
echo.
echo ==========================================================
echo O APP ABRIRA EM SEU NAVEGADOR PADRAO EM SEGUNDOS.
echo NAO FECHE ESTA JANELA PRETA ENQUANTO USA O APP.
echo ==========================================================
echo.

start npm start

:: Espera
timeout /t 5 >nul
