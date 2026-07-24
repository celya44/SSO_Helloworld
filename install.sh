#!/bin/bash

# Script d'installation et configuration initiale du projet Electron

echo "🚀 Installation du projet Electron SSO Helloworld..."
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js (v16 ou supérieur)"
    exit 1
fi

echo "✅ Node.js détecté: $(node --version)"
echo "✅ npm détecté: $(npm --version)"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo ""
echo "✨ Installation terminée!"
echo ""
echo "🎯 Commandes disponibles:"
echo "  npm run dev       - Démarrer en développement"
echo "  npm run dist      - Builder pour la plateforme actuelle"
echo "  npm run dist:win  - Builder pour Windows"
echo "  npm run dist:mac  - Builder pour macOS"
echo "  npm run dist:linux - Builder pour Linux"
echo "  npm run dist:all  - Builder pour toutes les plateformes"
echo ""
echo "📚 Pour plus d'information, consultez le README.md"
