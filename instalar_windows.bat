
@echo off
title Instalador PartnerHub CRM PRO
echo ==========================================
echo    BEM-VINDO AO PARTNERHUB CRM PRO
echo ==========================================
echo.
echo Este script ira preparar o ambiente desktop.
echo Certifique-se de ter o Node.js instalado.
echo.
pause
echo Instalando dependencias do Electron...
call npm install
echo.
echo Criando atalho e iniciando aplicativo...
start npm start
echo.
echo O PartnerHub esta sendo executado como um App Desktop!
echo.
pause
