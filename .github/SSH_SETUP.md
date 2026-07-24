# Configuration SSH pour GitHub

Guide pour configurer l'authentification par clé SSH avec GitHub.

## 🔑 Générer une Clé SSH

### Linux/macOS

```bash
# Générer une clé SSH (Ed25519 - recommandé)
ssh-keygen -t ed25519 -C "votre.email@example.com"

# Ou RSA (si Ed25519 n'est pas disponible)
ssh-keygen -t rsa -b 4096 -C "votre.email@example.com"
```

Vous serez invité à:
1. **Entrer la localisation** → Appuyez sur Entrée (défaut: `~/.ssh/id_ed25519`)
2. **Entrer une passphrase** → Recommandé pour plus de sécurité (optionnel)

```bash
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/user/.ssh/id_ed25519): 
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
```

### Windows (PowerShell)

```powershell
# Vérifier si OpenSSH est installé
Get-Command ssh

# Générer la clé
ssh-keygen -t ed25519 -C "votre.email@example.com"

# Ou RSA
ssh-keygen -t rsa -b 4096 -C "votre.email@example.com"
```

Répondez aux mêmes questions qu'en haut.

## 📋 Vérifier la Clé Générée

### Linux/macOS

```bash
# Voir la clé publique
cat ~/.ssh/id_ed25519.pub

# Voir la clé privée (NE PAS partager!)
cat ~/.ssh/id_ed25519
```

### Windows (PowerShell)

```powershell
# Voir la clé publique
type $env:USERPROFILE\.ssh\id_ed25519.pub

# Voir la clé privée (NE PAS partager!)
type $env:USERPROFILE\.ssh\id_ed25519
```

## 🔐 Ajouter la Clé à GitHub

### 1. Copier la clé publique

```bash
# Linux/macOS
cat ~/.ssh/id_ed25519.pub | pbcopy  # macOS
cat ~/.ssh/id_ed25519.pub | xclip -selection clipboard  # Linux
```

```powershell
# Windows
type $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

### 2. Ajouter à GitHub

1. Allez sur https://github.com/settings/keys
2. Cliquez "New SSH key"
3. **Title:** Donnez un nom (ex: "Mon Ordinateur")
4. **Key type:** Authentication Key
5. **Key:** Collez votre clé publique
6. Cliquez "Add SSH key"

## ✅ Tester la Connexion

```bash
ssh -T git@github.com
```

**Résultat attendu:**
```
The authenticity of host 'github.com (...)' can't be established.
...
Are you sure you want to continue connecting (yes/no)? yes
...
Hi YOUR_USERNAME! You've successfully authenticated, but GitHub does not provide shell access.
```

## 🔄 Configurer Git pour Utiliser SSH

### Option 1: Pour ce projet uniquement

```bash
cd /path/to/SSO_Helloworld

# Changer l'URL du remote (si vous l'aviez ajouté avec HTTPS)
git remote set-url origin git@github.com:YOUR_USERNAME/SSO_Helloworld.git

# Vérifier
git remote -v
```

### Option 2: Configuration Globale

```bash
# Configurer Git globalement
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"

# Voir la configuration
git config --global --list
```

## 🚀 Utiliser SSH pour Pousser

Maintenant vous pouvez pousser sans password!

```bash
# Pousser le code
git push origin main

# Pousser les tags
git push origin --tags

# Pousser une branche
git push origin develop
```

Vous ne serez plus demandé d'entrer un user/password! 🎉

## 🛠️ Dépannage

### "Permission denied (publickey)"

**Cause:** Git ne trouve pas votre clé SSH

**Solution:**
```bash
# Vérifier que l'agent SSH est en cours d'exécution
eval "$(ssh-agent -s)"

# Ajouter votre clé à l'agent
ssh-add ~/.ssh/id_ed25519

# Tester
ssh -T git@github.com
```

### "The key will only be used if Git can verify its OpenPGP signature"

Vous avez peut-être une clé GPG au lieu de SSH.

```bash
# Vérifier le type de clé
ls -la ~/.ssh/

# Vous devriez voir: id_ed25519, id_ed25519.pub, id_rsa, id_rsa.pub, etc.
```

### SSH fonctionne mais Git demande quand même le password

Votre remote utilise encore `https://`:

```bash
# Vérifier
git remote -v

# Devrait montrer: git@github.com:USER/REPO.git
# Pas: https://github.com/USER/REPO.git

# Corriger
git remote set-url origin git@github.com:YOUR_USERNAME/SSO_Helloworld.git
```

### "Bad configuration option: usekeychain"

Cela arrive sur Linux. Supprimez cette option:

```bash
# Éditer la config SSH
nano ~/.ssh/config

# Supprimez ou commentez les lignes contenant "usekeychain"
```

## 🔒 Sécurité

### ✅ À FAIRE

- ✅ Générer une clé SSH unique
- ✅ Protéger la clé privée avec une passphrase
- ✅ Ajouter la clé publique à GitHub
- ✅ Révoquer les anciennes clés

### ❌ À NE PAS FAIRE

- ❌ NE JAMAIS partager votre clé privée
- ❌ NE JAMAIS commiter la clé privée dans Git
- ❌ NE JAMAIS la poster en ligne

## 📚 Ressources

- [GitHub SSH Documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [SSH Key Generation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
- [Man page SSH](https://linux.die.net/man/1/ssh)

## 📝 Résumé des Commandes

```bash
# 1. Générer la clé
ssh-keygen -t ed25519 -C "votre.email@example.com"

# 2. Voir la clé publique (à ajouter sur GitHub)
cat ~/.ssh/id_ed25519.pub

# 3. Tester la connexion
ssh -T git@github.com

# 4. Configurer le remote (si nécessaire)
git remote set-url origin git@github.com:YOUR_USERNAME/SSO_Helloworld.git

# 5. Pousser sans password!
git push origin main
```

Voilà! Vous êtes prêt à pousser vos modifications avec SSH! 🚀
