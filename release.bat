@echo off
REM Script pour créer une release et déclencher les workflows GitHub Actions
REM Usage: release.bat VERSION

setlocal enabledelayedexpansion

if "%1"=="" (
  echo ❌ Usage: release.bat VERSION
  echo    Example: release.bat 1.0.0
  exit /b 1
)

set VERSION=%1
set TAG=v%VERSION%

echo 🚀 Préparation de la release %TAG%
echo.

REM Vérifier que nous sommes sur la branche main
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
if not "%CURRENT_BRANCH%"=="main" (
  echo ❌ Erreur: Vous devez être sur la branche 'main'
  echo    Branche actuelle: %CURRENT_BRANCH%
  exit /b 1
)

REM Mettre à jour la version dans package.json
echo 📝 Mise à jour de package.json...
powershell -Command "(Get-Content package.json) -replace '\"version\": \"[^\"]*\"', '\"version\": \"%VERSION%\"' | Set-Content package.json"

REM Committer la mise à jour
git add package.json
git commit -m "chore: bump version to %VERSION%"

REM Créer le tag
echo 🏷️  Création du tag %TAG%...
git tag -a %TAG% -m "Release %VERSION%"

REM Pusher vers GitHub
echo 📤 Push vers GitHub...
git push origin main
git push origin %TAG%

echo.
echo ✅ Release créée avec succès!
echo.
echo 📊 Workflows GitHub Actions ont été déclenchés:
echo    1. test.yml - Compilation et vérification
echo    2. build.yml - Build Windows/macOS/Linux
echo    3. release.yml - Création de la release
echo.
echo 🔍 Vous pouvez suivre la progression sur:
echo    https://github.com/YOUR_USER/YOUR_REPO/actions
echo.
echo 📦 Les artifacts seront disponibles après 20-25 minutes
pause
