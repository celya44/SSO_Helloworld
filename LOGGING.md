# Système de Logging

## Vue d'ensemble

Le système de logging capture tous les logs de l'application (console Electron et API PHP) et les rend accessibles depuis la page de connexion.

## Architecture

### Côté Electron

**Fichier: `electron/logger.ts`**
- Capture tous les logs de console (log, warn, error, info)
- Les écrit dans un fichier: `~/.config/SSO_Helloworld/logs/app.log`
- Gère la rotation des logs (max 10MB)

**Fichier: `electron/main.ts`**
- Initialise le logger au démarrage
- Setup les handlers IPC pour:
  - `logger:get-logs` - Récupère le contenu des logs
  - `logger:get-log-path` - Récupère le chemin du fichier log
  - `logger:clear-logs` - Efface les logs
- Appelle `closeLogger()` à l'arrêt de l'app

**Fichier: `electron/preload.ts`**
- Expose les fonctions de logs au renderer process:
  - `window.electron.getLogs()` - Récupère les logs
  - `window.electron.getLogPath()` - Récupère le chemin
  - `window.electron.clearLogs()` - Efface les logs

### Côté React

**Fichier: `src/Login.tsx`**
- Ajoute deux boutons sur la page de connexion:
  - 📋 **View Logs** - Affiche les logs dans une modale
  - ⬇️ **Download Logs** - Télécharge les logs en tant que fichier `.log`

**Fichier: `src/Login.css`**
- Styles pour la modale de logs
- Styles pour les boutons d'action

### Côté Backend (PHP)

**Fichier: `backend-api/logs.php`**
- Endpoint API: `/api/logs?action=view|download`
- Permet de récupérer les logs PHP via API

**Fichier: `backend-api/functions.php`**
- Fonction `log_message()` - Écrit dans `./logs/api.log`
- `logDebug()`, `logWarn()`, `logError()` - Logs nivelés

## Utilisation

### Pour les développeurs

#### Dans le code Electron/TypeScript:
```typescript
console.log('Message de log');    // Écrit dans app.log
console.warn('Attention');        // Écrit avec [WARN]
console.error('Erreur');          // Écrit avec [ERROR]
```

#### Dans le code React:
```typescript
// Récupérer les logs
const logs = await (window as any).electron.getLogs();

// Télécharger les logs
const logs = await (window as any).electron.getLogs();
const blob = new Blob([logs], { type: 'text/plain' });
// ... créer un lien de téléchargement

// Effacer les logs
await (window as any).electron.clearLogs();
```

#### Dans le code PHP:
```php
logDebug('Message de debug', ['variable' => 'valeur']);
logWarn('Avertissement');
logError('Erreur critique', ['error' => $e->getMessage()]);
```

### Pour les utilisateurs

1. **Voir les logs**
   - Cliquez sur le bouton "📋 View Logs" sur la page de connexion
   - Une modale affiche tous les logs en temps réel

2. **Télécharger les logs**
   - Cliquez sur "⬇️ Download Logs"
   - Un fichier `.log` est téléchargé avec la date/heure

3. **Effacer les logs**
   - Dans la modale, cliquez sur "🗑️ Clear Logs"
   - Confirmez la suppression

## Localisation des fichiers logs

### Logs Electron
- **Linux**: `~/.config/SSO_Helloworld/logs/app.log`
- **macOS**: `~/Library/Application Support/SSO_Helloworld/logs/app.log`
- **Windows**: `%APPDATA%\SSO_Helloworld\logs\app.log`

### Logs PHP
- **Chemin**: `backend-api/logs/api.log`
- **URL API**: `/api/logs?action=view` ou `/api/logs?action=download`

## Format des logs

### Electron (app.log)
```
[2026-07-27T10:30:45.123Z] [LOG] [Description du processus]
[2026-07-27T10:30:46.234Z] [WARN] Avertissement
[2026-07-27T10:30:47.345Z] [ERROR] Erreur critique
```

### PHP (api.log)
```
[2026-07-27 10:30:45] [DEBUG] Message de debug {"data":"valeur"}
[2026-07-27 10:30:46] [WARN] Avertissement
[2026-07-27 10:30:47] [ERROR] Erreur {"error":"détails"}
```

## Configuration

### Limites de taille
- **Electron**: Les logs sont rotatés à 10MB
- **PHP**: Pas de limite (manuel ou via API)

### Niveaux de logs
- **DEBUG**: Pour le développement (selon config)
- **INFO**: Informations générales
- **WARN**: Avertissements
- **ERROR**: Erreurs

## Troubleshooting

### Les logs ne s'affichent pas
1. Vérifiez que `initLogger()` est appelé dans `main.ts`
2. Vérifiez les permissions d'accès au répertoire `~/.config/SSO_Helloworld/logs`
3. Vérifiez que le disque n'est pas plein

### Les logs ne se sauvegardent pas
1. Vérifiez les permissions du répertoire logs
2. Vérifiez qu'il y a de l'espace disque disponible
3. Consultez la console Electron pour les erreurs

### Les logs sont trop volumineux
1. Téléchargez et sauvegardez les logs
2. Cliquez sur "Clear Logs" pour les effacer
3. Les logs seront automatiquement rotatés à 10MB

## Sécurité

⚠️ **Important**: Les logs peuvent contenir des informations sensibles:
- Tokens d'authentification
- Données utilisateur
- URLs de configuration

**Recommandations**:
1. Ne partagez jamais les logs sans vérifier le contenu
2. Masquez les données sensibles avant de les envoyer
3. Régulièrement effacez les anciens logs
4. Chiffrez les fichiers logs en production
