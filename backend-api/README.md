# Backend API - Validation SAML

API PHP qui reçoit les assertions SAML de l'application Electron et valide leur authenticité auprès de l'IdP.

## 🚀 Installation

### 1. Prérequis

- PHP >= 7.4
- Apache avec mod_rewrite activé
- Composer (pour installer les dépendances)

### 2. Installation des dépendances

```bash
cd backend-api
composer install
```

### 3. Configuration Apache

Ajouter un Virtual Host ou un Alias dans la configuration Apache:

```apache
# Dans /etc/apache2/sites-available/celyavox.conf (exemple)

<VirtualHost *:80>
    ServerName api.celyavox.local
    DocumentRoot /chemin/vers/SSO_Helloworld/backend-api
    
    <Directory /chemin/vers/SSO_Helloworld/backend-api>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/celyavox-api-error.log
    CustomLog ${APACHE_LOG_DIR}/celyavox-api-access.log combined
</VirtualHost>
```

Puis activer le site et recharger Apache:

```bash
sudo a2ensite celyavox.conf
sudo a2enmod rewrite
sudo systemctl reload apache2
```

Ou simple redirection pour développement local:

```apache
Alias /api /chemin/vers/SSO_Helloworld/backend-api
```

### 4. Configuration PHP

Éditer `config.php` et configurer:

- **IdP Metadata URL**: URL des métadonnées SAML de votre IdP (obligatoire)
  - Toutes les infos nécessaires (certificat, entryPoint) seront extraites automatiquement
  - Les métadonnées sont cachées pendant 1 heure pour performances
- **Debug mode**: `true` pendant le développement
- **Database**: Adapter `getUserConfiguration()` pour votre base de données

### 5. Métadonnées IdP

Vous n'avez besoin de fournir que **l'URL des métadonnées** de votre IdP dans `config.php`:

```php
'idp' => [
    'metadataUrl' => 'https://votre-idp.com/metadata.xml',
],
```

L'API PHP va automatiquement:
1. Télécharger les métadonnées
2. Extraire le certificat X509
3. Extraire l'entryPoint (SingleSignOnService)
4. Mettre en cache les métadonnées (1 heure par défaut)
5. Utiliser ces infos pour valider les assertions SAML

#### Pour samltest.dev (développement):

L'URL par défaut est déjà configurée:
```php
'metadataUrl' => 'https://www.samltest.dev/apps/app_01ky9mhqkr3gcghjzg0jeeptc7/metadata',
```

Rien à faire, ça marche directement! 🎉

#### Pour Okta, Azure AD, ou autre IdP:

Remplacer l'URL de métadonnées:

**Okta:**
```php
'metadataUrl' => 'https://votre-domaine.okta.com/app/123456/sso/saml/metadata',
```

**Azure AD:**
```php
'metadataUrl' => 'https://login.microsoftonline.com/YOUR-TENANT-ID/federationmetadata/2007-06/federationmetadata.xml',
```

**Generic:**
- Demander à votre IdP l'URL des métadonnées SAML
- Mettre cette URL dans `config.php`
- Relancer le serveur (ou attendre 1h pour invalider le cache)


## 📡 Utilisation

### Endpoint

```
POST /api/auth/validate
Content-Type: application/json
```

### Requête

```json
{
  "assertion": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><saml:Assertion ...>...</saml:Assertion>",
  "user": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

### Réponse réussie (200 OK)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>true</success>
  <timestamp>2024-07-24T15:30:45+00:00</timestamp>
  <user>
    <name>John Doe</name>
    <email>john.doe@example.com</email>
  </user>
  <config>
    <theme>light</theme>
    <language>fr</language>
    <notifications>enabled</notifications>
    <timezone>Europe/Paris</timezone>
  </config>
</response>
```

### Réponse d'erreur (400 Bad Request)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<response>
  <success>false</success>
  <timestamp>2024-07-24T15:30:45+00:00</timestamp>
  <error>SAML assertion validation failed: Invalid signature</error>
</response>
```

## 🔒 Sécurité

### Validation de signature

L'API vérifie la signature XML de l'assertion SAML avec le certificat public de l'IdP. Cela garantit que:
- L'assertion provient bien de l'IdP
- Elle n'a pas été modifiée en chemin

### Configuration recommandée pour production

1. **HTTPS obligatoire**: Configurer SSL/TLS dans Apache
2. **Authentification API**: Ajouter une clé API ou OAuth2
3. **Base de données sécurisée**: Remplacer la simulation dans `getUserConfiguration()`
4. **Logs**: Vérifier régulièrement `logs/api.log` pour les tentatives suspectes
5. **Rate limiting**: Ajouter une limite de requêtes par IP

## 📝 Logs

Les logs sont écrits dans `logs/api.log` (créé automatiquement).

Format:
```
[2024-07-24 15:30:45] [ERROR] Validation failed: Invalid signature
[2024-07-24 15:30:46] [DEBUG] SAML assertion validated, profile: {...}
```

## 🔧 Développement

### Structure de fichiers

```
backend-api/
├── index.php          # Endpoint principal
├── config.php         # Configuration
├── composer.json      # Dépendances PHP
├── .htaccess          # Routage Apache
├── .gitignore         # Fichiers à ignorer
└── logs/              # Dossier de logs (créé auto)
```

### Points d'extension

- `validateSAMLAssertion()` - Modifier la logique de validation
- `getUserConfiguration()` - Connecter à une base de données
- `extractProfile()` - Personnaliser l'extraction d'attributs

## 🐛 Dépannage

### "Invalid XML format"
- Vérifier que l'assertion est bien un XML valide
- Vérifier qu'elle n'est pas double-encodée en Base64

### "No IdP certificate configured"
- Récupérer le certificat de l'IdP (voir section "Récupérer le certificat")
- Le mettre dans `config.php` ou en variable d'environnement

### "SAML assertion signature validation failed"
- Vérifier que le certificat IdP est correct
- S'assurer que l'assertion n'a pas été modifiée
- Consulter `logs/api.log` pour plus de détails

## 📚 Références

- [OneLogin SAML PHP](https://github.com/onelogin/php-saml)
- [OASIS SAML 2.0](http://docs.oasis-open.org/security/saml/v2.0/saml-core-2.0-os.pdf)
- [samlteste.dev Metadata](https://www.samltest.dev/metadata/)
