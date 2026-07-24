# Quick Start - GitHub Actions

Votre projet Electron est maintenant configuré pour les builds automatiques avec GitHub Actions!

## 🚀 Démarrage Rapide

### 1. Initialiser le Repository Git

```bash
cd /path/to/SSO_Helloworld
git init
git add .
git commit -m "Initial commit"
```

### 2. Créer le Repository sur GitHub

1. Allez sur https://github.com/new
2. Nommez votre repo: `SSO_Helloworld`
3. Créez le repo
4. Suivez les instructions pour pousser votre code local

**Option A: Avec SSH (Recommandé - pas de password)**

```bash
# Configuration rapide (Linux/macOS)
chmod +x setup-ssh.sh && ./setup-ssh.sh

# Ou (Windows PowerShell)
.\setup-ssh.ps1
```

**Option B: Manuelle avec SSH**

```bash
git remote add origin git@github.com:YOUR_USERNAME/SSO_Helloworld.git
git branch -M main
git push -u origin main
```

Consultez [SSH_SETUP.md](SSH_SETUP.md) pour plus de détails.

**Option C: Avec HTTPS (Demande token)**

```bash
git remote add origin https://github.com/YOUR_USERNAME/SSO_Helloworld.git
git branch -M main
git push -u origin main
# Entrez votre token GitHub quand demandé
```

### 3. Premier Build

Maintenant, chaque push va déclencher les workflows:

```bash
# Modifier un fichier
echo "# Updated" >> README.md

# Committer et pusher
git add README.md
git commit -m "Update README"
git push origin main
```

Allez sur GitHub → **Actions** pour voir les workflows s'exécuter!

### 4. Créer une Release

#### Option A: Script (Linux/macOS)

```bash
chmod +x release.sh
./release.sh 1.0.0
```

#### Option B: Script (Windows)

```bash
release.bat 1.0.0
```

#### Option C: Manuelle

```bash
git checkout main
npm version minor  # ou patch, major
git push origin main --tags
```

Cela va:
1. ✅ Compiler le code (test.yml)
2. ✅ Builder pour Windows, macOS, Linux (build.yml)
3. ✅ Créer une release GitHub (release.yml)

## 📊 Workflows

| Workflow | Déclenché | Durée | Action |
|----------|-----------|-------|--------|
| **test.yml** | Push/PR vers main | 5-10 min | Compile TypeScript & React |
| **build.yml** | Tags `v*` | 20-25 min | Build tous les OS |
| **release.yml** | Tags `v*` | 2-3 min | Crée release + artifacts |

## 📦 Récupérer les Builds

### Via GitHub Web

1. Allez sur **Actions** → Sélectionnez le workflow
2. Cliquez sur le run le plus récent
3. Scrollez en bas → **Artifacts**
4. Téléchargez vos builds

### Via GitHub CLI

```bash
# Installer
brew install gh  # macOS
# ou pour Linux/Windows, voir https://cli.github.com

# Se connecter
gh auth login

# Télécharger
gh run list  # Voir les runs récents
gh run download <RUN_ID> -D ./builds
```

## 🔐 Configuration Avancée

### Signature du Code (Optionnel)

Pour signer vos applications macOS ou Windows:

1. Générez vos certificats
2. Allez sur GitHub → Settings → Secrets and variables → Actions
3. Ajoutez vos secrets:
   - `MAC_CERTIFICATE` (base64)
   - `MAC_CERTIFICATE_PASSWORD`
   - `WIN_CERTIFICATE` (base64)
   - `WIN_CERTIFICATE_PASSWORD`

4. Décommentez les lignes `env:` dans `.github/workflows/build.yml`

### Modifier les Workflows

Les workflows se trouvent dans `.github/workflows/`:
- `build.yml` - Build des binaires
- `release.yml` - Création de release
- `test.yml` - Tests et compilation

Pour les modifier:
```bash
# Éditez le fichier
nano .github/workflows/build.yml

# Committez et poussez
git add .github/workflows/build.yml
git commit -m "Update build workflow"
git push origin main
```

## 📚 Documentation

- [GitHub Actions Guide](.github/GITHUB_ACTIONS.md)
- [Checklist](.github/CHECKLIST.md)
- [README Principal](README.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## ❓ FAQ

### Q: Combien de temps pour un build complet?
**R:** ~20-25 minutes (les plateformes compilent en parallèle)

### Q: Où télécharger les builds?
**R:** GitHub → Actions → Artifacts (conservés 30 jours)

### Q: Puis-je changer la version du Node?
**R:** Oui, dans `.github/workflows/*.yml` changez `node-version: '18'`

### Q: Comment déboguer un build qui échoue?
**R:** Allez sur Actions → Cliquez sur le run → Scrollez pour voir les logs détaillés

### Q: Puis-je faire des builds quotidiens?
**R:** Oui, ajoutez une section `schedule:` dans le `on:` des workflows

### Q: Les artifacts sont conservés combien de temps?
**R:** 30 jours par défaut (modifiable avec `retention-days: 90`)

## 🆘 Support

Pour des problèmes avec GitHub Actions:
1. Vérifiez les logs: GitHub → Actions → Cliquez sur le run
2. Consultez [GITHUB_ACTIONS.md](.github/GITHUB_ACTIONS.md)
3. Vérifiez la documentation officielle: https://docs.github.com/en/actions

## ✅ Checklist

- [ ] Repository GitHub créé
- [ ] Code pushé vers GitHub
- [ ] Workflows visibles dans GitHub → Actions
- [ ] Lancé un premier push pour test.yml
- [ ] Créé un tag `v*` pour déclencher les builds
- [ ] Téléchargé les artifacts
- [ ] Testé les binaires téléchargés

Félicitations! Vos builds Electron sont maintenant automatisés! 🎉
