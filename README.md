# SSO Helloworld - Electron Application

Une application Electron cross-platform construite avec React et TypeScript. Supporte la création d'installers pour Windows, macOS et Linux.

## 🚀 Fonctionnalités

- ✅ Développement avec React et TypeScript
- ✅ Support multi-plateforme (Windows, macOS, Linux)
- ✅ Electron-builder pour les installers natifs
- ✅ Hot reload en développement
- ✅ Dev tools intégrés

## 📋 Prérequis

- Node.js (v16 ou supérieur)
- npm ou yarn

## 🔧 Installation

```bash
npm install
```

## 🏃 Démarrage en développement

```bash
npm run dev
```

Cela lancera:
- Le serveur React sur `http://localhost:3000`
- L'application Electron

## 🏗️ Build

### Build pour la plateforme actuelle

```bash
npm run dist
```

### Build pour Windows

```bash
npm run dist:win
```

Crée:
- NSIS installer (.exe)
- Portable executable (.exe)

### Build pour macOS

```bash
npm run dist:mac
```

Crée:
- DMG installer (.dmg)
- ZIP archive (.zip)

### Build pour Linux

```bash
npm run dist:linux
```

Crée:
- AppImage (.AppImage)
- Debian package (.deb)
- RPM package (.rpm)

### Build pour toutes les plateformes

```bash
npm run dist:all
```

## 📁 Structure du projet

```
├── src/
│   ├── main.ts              # Processus principal Electron
│   └── preload.ts           # Script de preload sécurisé
├── public/
│   ├── src/
│   │   ├── App.tsx          # Composant principal React
│   │   ├── App.css          # Styles de l'app
│   │   ├── index.tsx        # Point d'entrée React
│   │   └── index.css        # Styles globaux
│   └── index.html           # HTML d'entrée
├── dist/                    # Fichiers compilés TypeScript (généré)
├── build/                   # Fichiers React compilés (généré)
├── out/                     # Fichiers buildés Electron (généré)
├── package.json             # Dépendances et scripts
└── tsconfig.json            # Configuration TypeScript
```

## 🔐 Sécurité

- **Context Isolation** activé
- **Node Integration** désactivé
- **Preload script** pour la communication sécurisée
- Environnement d'exécution isolé

## 📦 Distribution

Les installers sont créés dans le dossier `out/`.

### Windows
- `SSO Helloworld Setup 1.0.0.exe` - Installeur NSIS
- `SSO Helloworld 1.0.0.exe` - Exécutable portable

### macOS
- `SSO Helloworld-1.0.0.dmg` - Installeur DMG
- `SSO Helloworld-1.0.0.zip` - Archive ZIP

### Linux
- `SSO Helloworld-1.0.0.AppImage` - AppImage
- `sso-helloworld-1.0.0.deb` - Package Debian
- `sso-helloworld-1.0.0.rpm` - Package RPM

## 🛠️ Configuration

Les paramètres de build sont configurés dans `package.json` sous la clé `build`.

Pour modifier le nom, l'ID ou les cibles de build, éditez la section `build` dans `package.json`.

## 📝 Licence

MIT

## 🤝 Support

Pour toute question ou problème, veuillez créer une issue.
