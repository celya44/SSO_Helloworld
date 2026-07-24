@echo off
REM Script d'installation et configuration initiale du projet Electron

echo 🚀 Installation du projet Electron SSO Helloworld...
echo.

REM Vérifier si Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez installer Node.js ^(v16 ou supérieur^)
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js détecté: %NODE_VERSION%
echo ✅ npm détecté: %NPM_VERSION%
echo.

REM Installer les dépendances
echo 📦 Installation des dépendances...
call npm install

if %errorlevel% equ 0 (
    echo ✅ Dépendances installées avec succès
) else (
    echo ❌ Erreur lors de l'installation des dépendances
    exit /b 1
)

echo.
echo ✨ Installation terminée!
echo.
echo 🎯 Commandes disponibles:
echo   npm run dev       - Démarrer en développement
echo   npm run dist      - Builder pour la plateforme actuelle
echo   npm run dist:win  - Builder pour Windows
echo   npm run dist:mac  - Builder pour macOS
echo   npm run dist:linux - Builder pour Linux
echo   npm run dist:all  - Builder pour toutes les plateformes
echo.
echo 📚 Pour plus d'information, consultez le README.md
pause
