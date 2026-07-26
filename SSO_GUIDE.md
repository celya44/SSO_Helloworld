# Guide de Configuration SSO - SAML v2 et OIDC

Cette application (celyavox) supporte l'authentification SSO via **SAML v2** et **OIDC**.

## 🚀 Configuration

### 1. Créer le fichier `sso.ini`

Le fichier `sso.ini` doit être placé dans votre répertoire utilisateur: `~/.config/celyavox/sso.ini`

Créez le répertoire et copiez le fichier d'exemple:

```bash
mkdir -p ~/.config/celyavox
cp sso.ini.example ~/.config/celyavox/sso.ini
```

### 2. Remplir les paramètres

Éditez `~/.config/celyavox/sso.ini` avec vos paramètres SSO:

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

### Métadonnées du SP (Service Provider)

Quand vous configurez votre application dans l'IdP, vous aurez besoin de fournir les **métadonnées de votre application** (le Service Provider). Voici ce qu'il faut donner à votre IdP:

| Paramètre | Valeur | Description |
|-----------|--------|-------------|
| **Entity ID** | `urn:celyavox:app` | Identifiant de votre application |
| **ACS URL** | `http://localhost:3000/auth/saml/callback` | URL de réponse (Assertion Consumer Service) |
| **Binding** | HTTP-POST | Méthode de transmission de la réponse SAML |

**Pour développement en local:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="urn:your-app">
  <SPSSODescriptor 
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="http://localhost:3000/auth/saml/callback"
      index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

**⚠️ Important pour la production:**
Remplacez `http://localhost:3000/auth/saml/callback` par votre URL réelle (HTTPS):
```
https://your-domain.com/auth/saml/callback
```

### Obtenir les Métadonnées de l'IdP

1. **Auprès de votre fournisseur d'identité**, demandez l'URL des métadonnées SAML
   - Format: `https://your-idp.com/metadata.xml`
   - Ou un fichier XML avec les métadonnées

2. Vous pouvez aussi télécharger le certificat public directement (format `.pem` ou `.crt`)

### Paramètres SAML

| Paramètre | Description |
|-----------|-------------|
| `metadataUrl` | **URL des métadonnées** de l'IdP (recommandé) |
| `certificateFilePath` | Chemin du certificat public de l'IdP (alternative) |
| `entryPoint` | URL du service d'authentification unique (SSO) du fournisseur |
| `issuer` | Identifiant unique de votre application (URN) |
| `callbackUrl` | URL où l'utilisateur sera redirigé après l'authentification |

### Exemple avec Okta

```ini
[SAML]
metadataUrl=https://your-org.okta.com/app/123/sso/saml/metadata
entryPoint=https://your-org.okta.com/app/123/sso/saml
issuer=urn:your-app
callbackUrl=http://localhost:3000/auth/saml/callback
```

**Où trouver l'URL de métadonnées Okta:**
1. Admin Console → Applications → Votre app SAML
2. Sign On tab → View SAML Setup Instructions
3. Identity Provider Metadata URL

Ou si vous préférez le certificat:

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
metadataUrl=https://login.microsoftonline.com/your-tenant/federationmetadata/2007-06/federationmetadata.xml
entryPoint=https://login.microsoftonline.com/your-tenant/saml2
issuer=urn:your-app
callbackUrl=http://localhost:3000/auth/saml/callback
```

**Où trouver l'URL de métadonnées Azure AD:**
1. Azure Portal → Azure Active Directory → Enterprise applications
2. Votre application → Single sign-on → SAML
3. Endpoint → Federation Metadata Document

---

## 📋 Configurer l'Application dans votre IdP

### Métadonnées de votre SP à fournir

Quand vous créez une nouvelle application SAML dans votre IdP, il vous demandera:

**1. Entity ID (Issuer du SP):**
```
urn:celyavox:app
```

**2. ACS URL (Assertion Consumer Service URL):**
```
http://localhost:3000/auth/saml/callback
```

**3. Nom de l'application:**
```
SSO Helloworld
```

### Exemple: Configuration dans Okta

1. **Admin Console** → Applications → Create App Integration
2. Choisir: **SAML 2.0**
3. Remplir **General Settings:**
   - App name: `celyavox`
4. Remplir **SAML Settings:**
   - Single sign on URL: `http://localhost:3000/auth/saml/callback`
   - Audience Restriction: `urn:celyavox:app`
5. **Next** → Finish
6. Aller à **Sign On** tab
7. Copier: **Identity Provider metadata URL** → Insérer dans `sso.ini` sous `metadataUrl`

### Exemple: Configuration dans Azure AD

1. **Azure Portal** → Azure AD → Enterprise applications → New application
2. Rechercher: **SAML**
3. Choisir: **Create your own application**
4. Name: `celyavox`
5. Aller à **Single sign-on** → SAML
6. Dans **Basic SAML Configuration:**
   - Identifier (Entity ID): `urn:celyavox:app`
   - Reply URL (Assertion Consumer Service URL): `http://localhost:3000/auth/saml/callback`
7. Télécharger: **Federation Metadata XML** → Insérer path dans `sso.ini` sous `certificateFilePath`

### Fichier SP Metadata

Un fichier `sp-metadata.xml` est inclus. Vous pouvez le fournir directement à votre IdP si demandé.

Ou si vous préférez le certificat:

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
├── sso.ini              # Configuration SSO (ne pas commiter!)
├── sso.ini.example      # Exemple de configuration
├── src/
│   ├── main.ts            # Processus principal Electron
│   ├── preload.ts         # Script de preload
│   ├── config.ts          # Lecture de sso.ini
│   └── auth.ts            # Logique d'authentification (IPC handlers)
├── public/src/
│   ├── App.tsx            # Composant principal
│   ├── Login.tsx           # Écran de connexion
│   ├── HelloWorld.tsx      # Écran de bienvenue
│   ├── Login.css
│   ├── HelloWorld.css
│   └── electron.d.ts       # Types TypeScript
└── .gitignore             # sso.ini est ignoré
```

## 🔒 Sécurité

- ✅ `sso.ini` est ignoré par Git (ne pas commiter vos secrets!)
- ✅ Les certificats `.pem` sont ignorés par Git
- ✅ Les secrets clients sont stockés localement
- ✅ Communication sécurisée entre Electron et React via IPC

### Bonnes Pratiques

1. **Ne jamais commiter `sso.ini`** - Il contient vos secrets
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
R: Vérifiez que `sso.ini` existe et contient les bonnes sections [SAML] ou [OIDC]

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
5. Créer `sso.ini` sur le serveur de production

## 🛠️ Dépannage

### Les boutons de connexion ne répondent pas

Vérifiez que:
1. `npm install` a été exécuté
2. `sso.ini` existe et est valide
3. Les logs Electron affichent: "Config loaded successfully"

### Erreur "SAML not configured"

`sso.ini` n'existe pas ou ne contient pas la section `[SAML]`.

### Erreur "Certificate not found"

Vérifiez le chemin du certificat:
```bash
ls -la /path/to/certificate.pem
```

Utilisez des chemins absolus dans `sso.ini`.
