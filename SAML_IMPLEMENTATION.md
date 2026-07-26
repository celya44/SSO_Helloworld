# Intégration SAML v2 Réelle - Guide d'Implémentation

## 🔄 Vue d'ensemble du flux SAML

L'application utilise maintenant une intégration SAML **réelle** avec:

1. **Serveur SAML local** (`electron/saml-server.ts`)
   - Lance un serveur Express sur le port 3001
   - Gère la stratégie SAML avec passport-saml
   - Télécharge automatiquement les métadonnées de l'IdP
   - Reçoit et traite les callbacks SAML

2. **Communication IPC** 
   - Electron → React via `ipcRenderer.on('auth:saml-success')`
   - Serveur SAML → Electron via `webContents.send('auth:saml-success')`

## 📋 Configuration Requise

### 1. Remplir `~/.config/celyavox/sso.ini`

```ini
[SAML]
# Option 1: Métadonnées (recommandé)
metadataUrl=https://your-idp.com/metadata.xml

# OU Option 2: Certificat + endPoint
certificateFilePath=/path/to/idp-certificate.pem
entryPoint=https://your-idp.com/saml/sso

issuer=urn:celyavox:app
callbackUrl=http://localhost:3000/auth/saml/callback
```

### 2. Configurer l'application dans votre IdP

Utilisez ces valeurs:
- **Entity ID / Issuer**: `urn:celyavox:app`
- **ACS URL**: `http://localhost:3000/auth/saml/callback` (dev) ou `https://your-domain.com/auth/saml/callback` (prod)

**Important pour développement local:**
- Utilisez **ngrok** pour créer un tunnel vers localhost
- Remplacez `http://localhost:3000` par votre URL ngrok dans sso.ini

## 🚀 Flux d'Authentification SAML

```
1. Utilisateur clique "SAML v2"
   ↓
2. React appelle: window.electron.invoke('auth:saml-login')
   ↓
3. Electron/auth.ts ouvre le navigateur externe vers:
   http://localhost:3001/auth/saml
   ↓
4. Serveur SAML crée une AuthRequest SAML
   ↓
5. Redirige vers l'IdP:
   https://your-idp.com/saml/sso?SAMLRequest=...
   ↓
6. Utilisateur s'authentifie à l'IdP
   ↓
7. IdP redirige vers http://localhost:3001/auth/saml/callback
   avec une SAMLResponse signée
   ↓
8. Serveur SAML:
   - Récupère la SAMLResponse
   - Vérifie la signature avec le certificat IdP
   - Extrait les données utilisateur
   - Envoie à Electron via IPC: auth:saml-success
   ↓
9. React (App.tsx) reçoit l'événement IPC
   ↓
10. Affiche "Hello World" avec les infos utilisateur
```

## 🔧 Fichiers Importants

### `electron/saml-server.ts` (NOUVEAU)
- Serveur SAML local
- Télécharge métadonnées automatiquement
- Valide les signatures SAML
- Extrait les données utilisateur

### `electron/auth.ts` (MODIFIÉ)
- Ouvre le navigateur externe pour le login
- Attend le callback du serveur SAML

### `src/App.tsx` (MODIFIÉ)
- Écoute les événements IPC du serveur SAML
- Gère les succès et erreurs d'authentification

### `src/Login.tsx` (MODIFIÉ)
- Bouton SAML lance le flux réel
- Affiche l'état "Connexion en cours..."

## 🛠️ Dépendances Ajoutées

```json
{
  "express": "4.x",
  "passport": "0.x",
  "passport-saml": "3.2.4",
  "xml2js": "0.x",
  "axios": "1.x"
}
```

## ⚠️ Points Importants

### Métadonnées SAML
- Le serveur télécharge automatiquement les métadonnées du `metadataUrl`
- Extrait le certificat public pour vérifier les signatures
- Extrait l'entryPoint (URL de redirection vers l'IdP)

### Sécurité
- Les certificats SAML sont vérifiés avant d'accepter les données utilisateur
- Les sessions utilisateur sont isolées par fenêtre Electron
- Le certificat doit être en format PEM (-----BEGIN CERTIFICATE-----)

### Développement Local
- **Port 3001**: Serveur SAML (ne change pas)
- **Port 3000**: React dev server
- Utilisez **ngrok** si votre IdP ne peut pas accéder à localhost

### Erreurs Courantes

**"SAML certificate not found"**
→ Vérifier que metadataUrl est accessible OU certificateFilePath existe

**"SAML authentication failed at IdP"**
→ Vérifier que l'ACS URL est correcte dans l'IdP

**"SAML callback never received"**
→ IdP ne peut pas atteindre http://localhost:3001/auth/saml/callback
→ Solution: Utiliser ngrok

## 📚 Prochaines Étapes

### Implémentation OIDC
La structure SAML peut être adaptée pour OIDC:
- Créer `electron/oidc-server.ts` 
- Utiliser `openid-client` au lieu de `passport-saml`
- Pattern similaire avec Express + IPC

### Production
1. Obtenir certificat SSL/TLS
2. Déployer sur domaine HTTPS
3. Mettre à jour `callbackUrl` dans sso.ini
4. Reconfigurer dans l'IdP avec nouvelle ACS URL

## 🧪 Test en Développement

```bash
# 1. Configurer sso.ini
mkdir -p ~/.config/celyavox
cp sso.ini.example ~/.config/celyavox/sso.ini
nano ~/.config/celyavox/sso.ini

# 2. Lancer l'app
npm run dev

# 3. Cliquer "SAML v2"
# 4. Vérifier les logs dans la console Electron (F12)
```

## 📖 Références

- [Passport SAML](https://github.com/node-saml/passport-saml)
- [OASIS SAML 2.0 Spec](https://docs.oasis-open.org/security/saml/v2.0/)
- [Okta SAML Setup](https://help.okta.com/en-us/Content/Topics/Sign-On/saml-setup.htm)
- [Azure AD SAML](https://learn.microsoft.com/en-us/azure/active-directory/develop/single-sign-on-saml-protocol)
