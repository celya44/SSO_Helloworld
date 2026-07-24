#!/bin/bash

# Script pour créer une release et déclencher les workflows GitHub Actions
# Usage: ./release.sh VERSION

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: ./release.sh VERSION"
  echo "   Example: ./release.sh 1.0.0"
  exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "🚀 Préparation de la release $TAG"
echo ""

# Vérifier que nous sommes sur la branche main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "❌ Erreur: Vous devez être sur la branche 'main'"
  echo "   Branche actuelle: $CURRENT_BRANCH"
  exit 1
fi

# Vérifier qu'il n'y a pas de changements non committés
if ! git diff-index --quiet HEAD --; then
  echo "❌ Erreur: Il y a des changements non committés"
  echo "   Veuillez committer ou stasher vos changements"
  exit 1
fi

# Mettre à jour la version dans package.json
echo "📝 Mise à jour de package.json..."
sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json
rm package.json.bak

# Committer la mise à jour
git add package.json
git commit -m "chore: bump version to $VERSION"

# Créer le tag
echo "🏷️  Création du tag $TAG..."
git tag -a "$TAG" -m "Release $VERSION"

# Pusher vers GitHub
echo "📤 Push vers GitHub..."
git push origin main
git push origin "$TAG"

echo ""
echo "✅ Release créée avec succès!"
echo ""
echo "📊 Workflows GitHub Actions ont été déclenchés:"
echo "   1. test.yml - Compilation et vérification"
echo "   2. build.yml - Build Windows/macOS/Linux"
echo "   3. release.yml - Création de la release"
echo ""
echo "🔍 Vous pouvez suivre la progression sur:"
echo "   https://github.com/YOUR_USER/YOUR_REPO/actions"
echo ""
echo "📦 Les artifacts seront disponibles après 20-25 minutes"
