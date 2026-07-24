# Checklist GitHub Actions

Avant de commencer à utiliser les workflows GitHub Actions, complétez cette checklist:

## ✅ Configuration Initiale

- [ ] Repository créé sur GitHub
- [ ] Code pushé vers GitHub
- [ ] `.github/workflows/` dossier présent (avec les workflows YAML)

## 🔑 Secrets GitHub (Optionnel)

Pour signer vos applications (recommandé pour distribution):

### macOS Code Signing
Si vous avez un Apple Developer Certificate:
1. Créez un P12 certificate
2. Encodez en base64: `cat cert.p12 | base64`
3. Ajoutez à GitHub Secrets:
   - `MAC_CERTIFICATE` - Le contenu base64
   - `MAC_CERTIFICATE_PASSWORD` - Le mot de passe
4. Décommentez les variables env dans `build.yml` (job macOS)

### Windows Code Signing
Si vous avez un certificate Windows:
1. Créez un PFX certificate
2. Encodez en base64
3. Ajoutez à GitHub Secrets:
   - `WIN_CERTIFICATE` - Le contenu base64
   - `WIN_CERTIFICATE_PASSWORD` - Le mot de passe
4. Décommentez les variables env dans `build.yml` (job Windows)

## 🚀 Premier Build

1. Assurez-vous que tous les fichiers sont sur GitHub:
   ```bash
   git push origin main
   ```

2. Allez sur GitHub → "Actions"

3. Vous devriez voir les workflows qui s'exécutent

4. Les logs s'affichent en temps réel

## 📦 Créer une Release

```bash
# Depuis la branche main
git checkout main

# Mettre à jour package.json version
# Ou utiliser npm version:
npm version minor

# Créer un tag
git push origin main --tags
```

Cela va:
1. Déclencher **build.yml** pour compiler tous les binaires
2. Déclencher **release.yml** pour créer la release automatiquement

## 📥 Récupérer les Builds

### Via GitHub Web
1. Actions → Sélectionnez le workflow récent
2. Scrollez en bas → "Artifacts"
3. Téléchargez les fichiers

### Via GitHub CLI
```bash
# Installer gh (si pas déjà)
brew install gh  # macOS/Linux
# ou
choco install gh  # Windows

# Se connecter
gh auth login

# Télécharger les artifacts
gh run download <run_id> -D ./builds
```

## 🔍 Vérifier les Logs

```bash
# Lister les runs
gh run list

# Voir les détails d'un run
gh run view <run_id>

# Voir les logs complets
gh run view <run_id> --log
```

## ⏰ Temps de Build

- **Windows**: ~10-15 minutes
- **macOS**: ~15-20 minutes
- **Linux**: ~10-15 minutes
- **Total** (parallèle): ~20-25 minutes

Les workflows s'exécutent en parallèle donc c'est plus rapide qu'en série.

## 💾 Artifacts

Les builds sont conservés **30 jours** par défaut.

Pour changer cette durée:
```yaml
- uses: actions/upload-artifact@v3
  with:
    name: windows-build
    path: out/*.exe
    retention-days: 90  # Changer à 90 jours
```

## 🔄 Workflows Récurrents

Pour faire des builds quotidiens:

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2h du matin UTC, tous les jours
```

Ajoutez ça au début de `build.yml`.

## 📝 Notes

- Les workflows utilisent les **versions stables** de Node.js (18)
- Les **dépendances systèmes** Linux sont installées automatiquement
- Les **artifacts** ne comportent pas les sources (juste les binaires)
- Les **logs** sont conservés pour déboguer

## ❓ Support

Pour plus d'aide:
- Consultez `.github/GITHUB_ACTIONS.md`
- Allez sur Actions → Logs
- Vérifiez la documentation officielle: https://docs.github.com/en/actions
