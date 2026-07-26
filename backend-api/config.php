<?php
/**
 * Configuration de l'API SAML de validation
 * 
 * À personnaliser selon votre environnement
 */

return [
    'idp' => [
        // L'URL des métadonnées de l'IdP (PRIORITAIRE si renseignée)
        // Toutes les infos (certificat, entryPoint, etc.) seront extraites de cette URL
        // Configurez ceci dans sso.ini ou dans le code ci-dessous
        'metadataUrl' => 'https://www.samltest.dev/apps/app_01ky9mhqkr3gcghjzg0jeeptc7/metadata',
        
        // URL pour télécharger le certificat public de l'IdP
        // Utilisée en alternative si metadataUrl n'est pas disponible
        // Priorité: metadataUrl > certificateUrl
       // 'certificateUrl' =>  'https://oidc-vlejo7.eu1.zitadel.cloud/saml/v2/certificate',
        
        // Chemin local du certificat IdP (alternative)
        //'certificateFilePath' => null,
        
        // Les valeurs suivantes seront extraites automatiquement des métadonnées:
        // - singleSignOnService.url (entryPoint)
        // - x509cert (certificat public de l'IdP)
    ],
    
    /**
     * Configuration de sécurité
     */
    'security' => [
        'nameIdEncrypted' => false,
        'authnRequestsSigned' => false,
        'wantAssertionsSigned' => true,
        'wantResponseSigned' => false,
        'signatureAlgorithm' => 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
        'digestAlgorithm' => 'http://www.w3.org/2001/04/xmlenc#sha256',
    ],
    
    /**
     * Configuration de l'API
     */
    'api' => [
        // Format accepté pour les assertions
        'assertionFormat' => 'xml', // 'xml' ou 'base64'
        
        // Logging
        'debug' => true, // Force tous les logs DEBUG
        'logPath' => __DIR__ . '/logs',
        
        // Cache des métadonnées (en secondes)
        'metadataCacheTTL' => 3600, // 1 heure
        'metadataCachePath' => __DIR__ . '/cache',
        
        // CORS (si nécessaire)
        'cors' => [
            'allowedOrigins' => ['http://localhost:3000', 'http://localhost:3001'],
        ],
    ],
];
