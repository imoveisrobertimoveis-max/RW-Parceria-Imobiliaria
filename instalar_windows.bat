
@echo off
setlocal
title INSTALADOR PARTNERHUB CRM PRO - O CAMINHO

:: Configuração de Cores (Fundo Preto, Texto Branco Brilhante)
color 0F

echo ============================================================
echo      BEM-VINDO AO CAMINHO DE INSTALACAO - PARTNERHUB
echo ============================================================
echo.
echo Este script vai preparar seu computador para rodar o CRM.
echo.

:: PASSO 1: VERIFICAR NODE.JS
echo [PASSO 1/3] Verificando o 'motor' (Node.js)...
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo ERRO: O MOTOR (NODE.JS) NAO FOI ENCONTRADO!
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo.
    echo Sem o Node.js, o CRM nao consegue "ligar". 
    echo Vou abrir a pagina de download para voce agora...
    echo.
    timeout /t 5
    start https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi
    echo.
    echo INSTRUCOES:
    echo 1. Instale o arquivo que foi baixado no navegador.
    echo 2. Clique em "Next" em todas as telas.
    echo 3. APOS INSTALAR, REINICIE O SEU COMPUTADOR.
    echo 4. Volte aqui e abra este arquivo (.bat) de novo.
    echo.
    pause
    exit /b
)

echo [OK] Motor detectado com sucesso!
echo.

:: PASSO 2: INSTALAR COMPONENTES
echo [PASSO 2/3] Instalando bibliotecas do sistema...
echo (Isso depende da sua internet, por favor aguarde...)
echo.

if not exist "node_modules" (
    call npm install --no-audit --no-fund
) else (
    echo Componentes ja estao no lugar. Verificando atualizacoes...
    call npm update --no-audit
)

if %errorlevel% neq 0 (
    color 0E
    echo.
    echo AVISO: A instalacao automatica falhou. 
    echo Verifique sua internet e tente clicar com o botao direito 
    echo e "Executar como Administrador".
    echo.
    pause
)

:: PASSO 3: LIGAR O CRM
echo.
echo [PASSO 3/3] Ligando os motores... Tudo pronto!
echo.
echo ============================================================
echo O CRM VAI ABRIR NO SEU NAVEGADOR EM ALGUNS SEGUNDOS.
echo.
echo DICA: Mantenha esta janela aberta enquanto usa o sistema.
echo ============================================================
echo.

start npm start

:: Mantém a janela aberta por 10 segundos antes de minimizar
timeout /t 10
