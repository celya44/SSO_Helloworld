# GitHub Actions - Workflow de Build

Ce projet utilise GitHub Actions pour automatiser les builds cross-plateforme.

## 📋 Workflows Disponibles

### 1. **build.yml** - Build Automatique

Déclenché automatiquement sur:
- Push vers `main` ou `develop`
- Push de tags (ex: `v1.0.0`)
- Pull requests vers `main` ou `develop`

**Actions:**
- ✅ Build Windows (NSIS + Portable)
- ✅ Build macOS (DMG + ZIP)
- ✅ Build Linux (AppImage + DEB + RPM)
- 📤 Upload des artifacts
- 🔖 Upload automatique aux releases (sur tags)

**Durée approximative:** 30-45 minutes (tous les jobs en parallèle)

### 2. **release.yml** - Création Automatique de Release

Déclenché automatiquement lors de la création d'un tag `v*`

**Actions:**
- 📝 Crée une release GitHub avec description
- 📋 Ajoute des instructions d'installation
- 📦 Attache tous les artifacts du build

### 3. **test.yml** - Tests & Compilation

Déclenché automatiquement sur:
- Push vers `main` ou `develop`
- Pull requests

**Actions:**
- ✅ Compile TypeScript (Electron main process)
- ✅ Build React (renderer process)
- 🔍 Vérifie qu'il n'y a pas d'erreurs de compilation

## 🚀 Workflow de Déploiement

### 1. Développement Normal
```bash
git push origin develop
```
→ Le workflow **test.yml** compile et vérifie le code

### 2. Préparer une Release
```bash
# Mettre à jour la version dans package.json
npm version minor  # ou major, patch

# Créer le tag et pusher
git push origin main --tags
```

→ Les workflows **build.yml** et **release.yml** se déclenchent automatiquement
→ Les binaires sont uploadés à la release GitHub

### 3. Récupérer les Builds

#### Via GitHub Web UI
1. Allez sur "Actions" → Sélectionnez le workflow
2. Trouvez le run le plus récent
3. Téléchargez les artifacts en bas ("Artifacts")

#### Via CLI
```bash
# Télécharger les artifacts d'un workflow
gh run download <run_id> --dir ./downloads
```

## 🔧 Configuration

### Variables d'Environnement

Les workflows peuvent utiliser des secrets GitHub pour:
- Certificats de signature macOS
- Certificats de signature Windows
- Tokens personnalisés

```yaml
env:
  CSC_LINK: ${{ secrets.MAC_CERTIFICATE }}
  CSC_KEY_PASSWORD: ${{ secrets.MAC_CERTIFICATE_PASSWORD }}
  WIN_CSC_LINK: ${{ secrets.WIN_CERTIFICATE }}
  WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERTIFICATE_PASSWORD }}
```

**Pour configurer:**
1. Allez sur Settings → Secrets and variables → Actions
2. Cliquez "New repository secret"
3. Ajoutez vos secrets

### Modifier les Workflows

Les workflows se trouvent dans `.github/workflows/`

**Éditer un workflow:**
```bash
# Modifier le fichier
vi .github/workflows/build.yml

# Committer et pusher
git add .github/workflows/build.yml
git commit -m "Update build workflow"
git push
```

## 📊 Monitoring

### Voir l'état des workflows

**Via GitHub Web:**
1. Allez sur "Actions"
2. Sélectionnez le workflow
3. Voyez l'historique des runs

**Via CLI:**
```bash
# Lister les runs récents
gh run list

# Voir les détails d'un run
gh run view <run_id>

# Voir les logs d'un job
gh run view <run_id> --log
```

## ⚙️ Optimisations

### Caching
Les workflows utilisent `cache: 'npm'` pour mettre en cache `node_modules` et accélérer les installations.

### Artifacts
Les artifacts sont conservés pendant 30 jours par défaut (configurable dans GitHub).

### Parallélisation
Les jobs de build Windows, macOS et Linux s'exécutent **en parallèle** pour gagner du temps.

## 🛠️ Dépannage

### Le build échoue avec "npm not found"

Vérifiez que `actions/setup-node@v4` est dans le workflow et qu'il configure bien Node.js.

### Les artifacts ne sont pas créés

Vérifiez que:
1. Le build s'est déroulé sans erreur
2. Les fichiers sont bien dans le chemin `out/` spécifié

### La release ne se crée pas automatiquement

Vérifiez:
1. Que vous avez créé un tag au format `v*` (ex: `v1.0.0`)
2. Que le workflow **build.yml** a réussi avant

### Signature macOS/Windows ne fonctionne pas

Vous devrez:
1. Générer les certificats
2. Les convertir en base64
3. Les ajouter aux secrets GitHub
4. Les utiliser dans les workflows (voir section "Configuration")

## 📚 Ressources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Electron Builder & CI/CD](https://www.electron.build/multi-platform-build)
- [Actions Market Place](https://github.com/marketplace?type=actions)
