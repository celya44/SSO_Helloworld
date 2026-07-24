# Guide SSO - SAML v2 et OIDC

Cette application supporte l'authentification SSO via **SAML v2** et **OIDC**.

## 🚀 Configuration

### 1. Créer le fichier `config.ini`

Copiez `config.ini.example` en `config.ini`:

```bash
cp config.ini.example config.ini
```

### 2. Remplir les paramètres

Éditez `config.ini` avec vos paramètres SSO:

```ini
[SAML]
certificateFilePath=/path/to/idp-certificate.pem
entryPoint=https://your-idp.com/auth
issuer=urn:your-app
callbackUrl=http://localhost:3000/auth/saml/callback

[OIDC]
issuer=https://your-oidc-provider.com
client_id=your_client_id
client_secret=your_client_secret
redirect_uri=http://localhost:3000/auth/oidc/callback
scopes=openid,profile,email
```

### 3. Démarrer l'application

```bash
npm install
npm run dev
```

L'application affichera deux boutons:
- 🔐 **SAML v2** - Authentification SAML
- 🔑 **OIDC** - Authentification OpenID Connect

## 🔐 SAML v2

SAML (Security Assertion Markup Language) est un standard d'authentification basé sur XML.

### Paramètres SAML

| Paramètre | Description |
|-----------|-------------|
| `certificateFilePath` | Chemin vers le certificat public du fournisseur d'identité |
| `entryPoint` | URL du service d'authentification unique (SSO) du fournisseur |
| `issuer` | Identifiant unique de votre application (URN) |
| `callbackUrl` | URL où l'utilisateur sera redirigé après l'authentification |

### Exemple avec Okta

```ini
[SAML]
certificateFilePath=/path/to/okta-cert.pem
entryPoint=https://your-org.okta.com/app/123/sso/saml
issuer=urn:your-app
callbackUrl=http://localhost:3000/auth/saml/callback
```

### Exemple avec Azure AD

```ini
[SAML]
certificateFilePath=/path/to/azure-cert.pem
entryPoint=https://login.microsoftonline.com/your-tenant/saml2
issuer=urn:your-app
callbackUrl=http://localhost:3000/auth/saml/callback
```

## 🔑 OIDC

OIDC (OpenID Connect) est une couche d'authentification construite sur OAuth 2.0.

### Paramètres OIDC

| Paramètre | Description |
|-----------|-------------|
| `issuer` | URL du fournisseur OIDC |
| `client_id` | Identifiant client fourni par le fournisseur |
| `client_secret` | Secret client fourni par le fournisseur |
| `redirect_uri` | URL de redirection après authentification |
| `scopes` | Permissions demandées (séparées par des virgules) |

### Exemple avec Google

```ini
[OIDC]
issuer=https://accounts.google.com
client_id=your-client-id.apps.googleusercontent.com
client_secret=your-client-secret
redirect_uri=http://localhost:3000/auth/oidc/callback
scopes=openid,profile,email
```

### Exemple avec Okta

```ini
[OIDC]
issuer=https://your-org.okta.com
client_id=0oa123xyz
client_secret=your-secret
redirect_uri=http://localhost:3000/auth/oidc/callback
scopes=openid,profile,email
```

### Exemple avec Microsoft/Azure AD

```ini
[OIDC]
issuer=https://login.microsoftonline.com/your-tenant/v2.0
client_id=your-application-id
client_secret=your-secret
redirect_uri=http://localhost:3000/auth/oidc/callback
scopes=openid,profile,email
```

## 📁 Structure des Fichiers

```
├── config.ini              # Configuration SSO (ne pas commiter!)
├── config.ini.example      # Exemple de configuration
├── src/
│   ├── main.ts            # Processus principal Electron
│   ├── preload.ts         # Script de preload
│   ├── config.ts          # Lecture de config.ini
│   └── auth.ts            # Logique d'authentification (IPC handlers)
├── public/src/
│   ├── App.tsx            # Composant principal
│   ├── Login.tsx           # Écran de connexion
│   ├── HelloWorld.tsx      # Écran de bienvenue
│   ├── Login.css
│   ├── HelloWorld.css
│   └── electron.d.ts       # Types TypeScript
└── .gitignore             # config.ini est ignoré
```

## 🔒 Sécurité

- ✅ `config.ini` est ignoré par Git (ne pas commiter vos secrets!)
- ✅ Les certificats `.pem` sont ignorés par Git
- ✅ Les secrets clients sont stockés localement
- ✅ Communication sécurisée entre Electron et React via IPC

### Bonnes Pratiques

1. **Ne jamais commiter `config.ini`** - Il contient vos secrets
2. **Utiliser des variables d'environnement en production**:
   ```bash
   export SAML_CERT_PATH=/secure/path/cert.pem
   export OIDC_CLIENT_SECRET=your-secret
   ```
3. **Chiffrer le stockage local** pour les applications sensibles
4. **Utiliser HTTPS** en production

## 🧪 Tester Localement

### Mode Simulation

Par défaut, l'application simule une authentification réussie pour tester l'interface.

Pour implémenter l'authentification réelle, modifiez `src/auth.ts`:

```typescript
// Au lieu de retourner une simulation:
const user = {
  name: 'SAML User',
  email: 'user@example.com',
  method: 'saml',
};

// Vous pouvez utiliser des bibliothèques:
import { Strategy as SamlStrategy } from 'passport-saml';
import { Client } from 'openid-client';
```

### Flux d'Authentification

1. **Utilisateur clique** sur "SAML v2" ou "OIDC"
2. **Electron appelle** `window.electron.invoke('auth:saml-login')`
3. **Le handler IPC** dans `src/auth.ts` traite la requête
4. **Authentification** réussit ou échoue
5. **React affiche** HelloWorld ou un message d'erreur

## 📚 Ressources Complémentaires

- [SAML Documentation](https://en.wikipedia.org/wiki/SAML_2.0)
- [OpenID Connect Documentation](https://openid.net/connect/)
- [Passport.js SAML](http://www.passportjs.org/packages/passport-saml/)
- [openid-client](https://github.com/panva/node-openid-client)
- [Okta SAML Guide](https://developer.okta.com/docs/guides/saml-application-setup/)
- [Azure AD OIDC](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-protocols-oidc)

## ❓ FAQ

**Q: Comment obtenir le certificat SAML?**
R: Votre fournisseur d'identité le fournit. Pour Okta: Settings → Applications → votre app → Sign On → View SAML Setup Instructions

**Q: Comment obtenir les paramètres OIDC?**
R: Créez une application dans votre fournisseur. Les paramètres seront fournis dans le "Client Details" ou "Application Settings"

**Q: La connexion échoue "not configured"**
R: Vérifiez que `config.ini` existe et contient les bonnes sections [SAML] ou [OIDC]

**Q: Comment tester sans fournisseur réel?**
R: L'app simule actuellement une authentification. Remplacez le code dans `src/auth.ts` par votre logique réelle.

**Q: Puis-je utiliser les deux méthodes?**
R: Oui! L'utilisateur peut choisir entre SAML ou OIDC au login.

## 🚀 Déploiement

Avant de deployer:
1. Implémenter l'authentification réelle dans `src/auth.ts`
2. Gérer les secrets de manière sécurisée (variables d'env, gestionnaire de secrets)
3. Tester avec un vrai fournisseur d'identité
4. Mettre à jour les URLs de callback pour votre domaine
5. Créer `config.ini` sur le serveur de production

## 🛠️ Dépannage

### Les boutons de connexion ne répondent pas

Vérifiez que:
1. `npm install` a été exécuté
2. `config.ini` existe et est valide
3. Les logs Electron affichent: "Config loaded successfully"

### Erreur "SAML not configured"

`config.ini` n'existe pas ou ne contient pas la section `[SAML]`.

### Erreur "Certificate not found"

Vérifiez le chemin du certificat:
```bash
ls -la /path/to/certificate.pem
```

Utilisez des chemins absolus dans `config.ini`.
