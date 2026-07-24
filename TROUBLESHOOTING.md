# Guide de Dépannage

## 🐛 Problèmes Courants

### Le processus Electron démarre avant que React soit prêt

**Solution:** Le projet utilise `wait-on` pour s'assurer que le serveur React (port 3000) est accessible avant de lancer Electron.

```bash
npm run dev
```

### Erreur: "Cannot find module 'electron-is-dev'"

**Solution:** Réinstallez les dépendances:

```bash
npm install
```

### Les raccourcis clavier ne fonctionnent pas sous Linux

Certains raccourcis clavier peuvent être interceptés par le gestionnaire de fenêtres. Essayez de configurer des raccourcis personnalisés dans le fichier `src/main.ts`.

### L'application démarre en mode production avec localhost:3000

**Solution:** Vérifiez que vous utilisez `npm run dev` et non `npm run dist`.

### Problèmes de build sous macOS

Pour signer vos applications macOS:
- Vous aurez besoin d'un certificat de développeur Apple
- Configurez les variables d'environnement:
  ```bash
  export CSC_LINK="/path/to/certificate.p12"
  export CSC_KEY_PASSWORD="password"
  ```

### Problèmes de build sous Linux

Assurez-vous que vous avez les dépendances système requises:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential python3

# Fedora
sudo dnf install gcc python3

# Arch
sudo pacman -S base-devel python
```

### Erreur: "Icon not found" lors du build

Placez vos icônes dans le dossier `assets/`:
- Windows: `icon.ico` ou `icon.png`
- macOS: `icon.icns` ou `icon.png`
- Linux: `icon.png` ou `icon.svg`

## 🔧 Modifications Personnalisées

### Changer le nom de l'application

Modifiez dans `package.json`:
- `name` - ID de l'application
- `build.productName` - Nom affiché dans l'interface

### Changer le port du serveur React

Modifiez dans `src/main.ts`:
```typescript
const startUrl = isDev
  ? 'http://localhost:3000'  // Changez le port ici
  : `file://${path.join(__dirname, '../build/index.html')}`;
```

Et dans `dev:electron` dans `package.json`:
```json
"dev:electron": "wait-on http://localhost:VOTRE_PORT && electron ."
```

### Utiliser Yarn au lieu de npm

Modifiez `package.json`:
```json
"build": {
  "build": {
    "pkgManager": "yarn"
  }
}
```

## 📞 Support Supplémentaire

Pour plus d'aide:
- [Documentation Electron](https://www.electronjs.org/docs)
- [Documentation electron-builder](https://www.electron.build/)
- [Documentation React](https://react.dev/)
