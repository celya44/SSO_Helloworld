<?php
/**
 * Fonctions communes pour la validation SAML et OIDC
 */

require_once __DIR__ . '/vendor/autoload.php';

use RobRichards\XMLSecLibs\XMLSecurityDSig;
use RobRichards\XMLSecLibs\XMLSecurityKey;

/**
 * Récupérer la configuration
 */
function getConfig() {
    static $config = null;
    if ($config === null) {
        $config = require __DIR__ . '/config.php';
    }
    return $config;
}

/**
 * Récupérer la source du certificat IdP avec priorité:
 * 1. metadataUrl (recommandé)
 * 2. certificateUrl 
 * 3. certificateFilePath
 * 
 * Retourne: ['type' => 'metadata'|'certificate_url'|'certificate_file', 'content' => ...., 'source' => ...]
 */
function getIdPCertificateWithSource($config) {
    try {
        $metadataUrl = $config['idp']['metadataUrl'] ?? null;
        $certificateUrl = $config['idp']['certificateUrl'] ?? null;
        $certificateFilePath = $config['idp']['certificateFilePath'] ?? null;
        
        // Priorité 1: metadataUrl
        if (!empty($metadataUrl)) {
            logDebug('Using metadataUrl (priority 1)', ['url' => $metadataUrl]);
            $metadataContent = getIdPMetadata($metadataUrl, $config);
            return [
                'type' => 'metadata',
                'content' => $metadataContent,
                'source' => $metadataUrl,
            ];
        }
        
        // Priorité 2: certificateUrl
        if (!empty($certificateUrl)) {
            logDebug('Using certificateUrl (priority 2)', ['url' => $certificateUrl]);
            $certificateContent = downloadCertificate($certificateUrl, $config);
            return [
                'type' => 'certificate_url',
                'content' => $certificateContent,
                'source' => $certificateUrl,
            ];
        }
        
        // Priorité 3: certificateFilePath
        if (!empty($certificateFilePath)) {
            logDebug('Using certificateFilePath (priority 3)', ['path' => $certificateFilePath]);
            if (!file_exists($certificateFilePath)) {
                throw new Exception('Certificate file not found: ' . $certificateFilePath);
            }
            $certificateContent = file_get_contents($certificateFilePath);
            if (!$certificateContent) {
                throw new Exception('Failed to read certificate file: ' . $certificateFilePath);
            }
            return [
                'type' => 'certificate_file',
                'content' => $certificateContent,
                'source' => $certificateFilePath,
            ];
        }
        
        throw new Exception('No IdP metadata or certificate source configured');
        
    } catch (Exception $e) {
        logError('Failed to get IdP certificate source', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Récupérer les métadonnées IdP (avec cache)
 */
function getIdPMetadata($metadataUrl, $config) {
    try {
        logDebug('Fetching IdP metadata', ['url' => $metadataUrl]);
        
        // Chercher dans le cache
        $cacheFile = $config['api']['metadataCachePath'] . '/idp-metadata.xml';
        $cacheTTL = $config['api']['metadataCacheTTL'];
        
        if (file_exists($cacheFile)) {
            $cacheAge = time() - filemtime($cacheFile);
            if ($cacheAge < $cacheTTL) {
                logDebug('Using cached metadata', ['age' => $cacheAge]);
                return file_get_contents($cacheFile);
            }
        }
        
        // Télécharger les métadonnées
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'follow_location' => true,
                'max_redirects' => 5,
            ],
            'https' => [
                'timeout' => 10,
                'follow_location' => true,
                'max_redirects' => 5,
                'verify_peer' => true,
            ],
        ]);
        
        $metadataContent = @file_get_contents($metadataUrl, false, $context);
        
        if (!$metadataContent) {
            throw new Exception('Failed to fetch metadata from ' . $metadataUrl);
        }
        
        // Sauvegarder en cache
        file_put_contents($cacheFile, $metadataContent);
        
        return $metadataContent;
        
    } catch (Exception $e) {
        logError('Failed to fetch IdP metadata', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Télécharger un certificat depuis une URL
 */
function downloadCertificate($certificateUrl, $config) {
    try {
        logDebug('Downloading certificate', ['url' => $certificateUrl]);
        
        $context = stream_context_create([
            'http' => [
                'timeout' => 10,
                'follow_location' => true,
                'max_redirects' => 5,
            ],
            'https' => [
                'timeout' => 10,
                'follow_location' => true,
                'max_redirects' => 5,
                'verify_peer' => true,
            ],
        ]);
        
        $certificateContent = @file_get_contents($certificateUrl, false, $context);
        
        if (!$certificateContent) {
            throw new Exception('Failed to download certificate from ' . $certificateUrl);
        }
        
        logDebug('Certificate downloaded successfully', ['size' => strlen($certificateContent)]);
        
        // Normaliser le certificat au format PEM
        $normalizedCert = formatCertificateToPEM($certificateContent);
        
        logDebug('Certificate after formatting to PEM', [
            'formatted_size' => strlen($normalizedCert),
            'formatted_preview' => substr($normalizedCert, 0, 150),
        ]);
        
        return $normalizedCert;
        
    } catch (Exception $e) {
        logError('Failed to download certificate', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Formater un certificat au format PEM (avec balises BEGIN/END)
 * Détecte: DER binaire, hex, base64 brut, et ajoute les balises PEM si nécessaire
 */
function formatCertificateToPEM($cert) {
    try {
        $cert = trim($cert);
        
        // Si c'est déjà en PEM avec les balises, c'est bon
        if (strpos($cert, '-----BEGIN CERTIFICATE-----') !== false) {
            logDebug('Certificate already in PEM format');
            return $cert;
        }
        
        // Essayer comme du base64 (format le plus courant depuis les URLs)
        if (preg_match('/^[A-Za-z0-9+\/]*={0,2}$/', $cert)) {
            // C'est du base64, ajouter les balises PEM
            $cert = trim($cert);
            $cert = wordwrap($cert, 64, "\n", true);
            $pem = "-----BEGIN CERTIFICATE-----\n" . $cert . "\n-----END CERTIFICATE-----";
            logDebug('Certificate formatted as base64 -> PEM');
            return $pem;
        }
        
        // Sinon, essayer de le traiter comme du DER binaire et le convertir en base64
        if (!ctype_print($cert)) {
            // C'est du binaire, probablement DER
            $base64 = base64_encode($cert);
            $base64 = wordwrap($base64, 64, "\n", true);
            $pem = "-----BEGIN CERTIFICATE-----\n" . $base64 . "\n-----END CERTIFICATE-----";
            logDebug('Certificate formatted as DER -> PEM');
            return $pem;
        }
        
        // Retourner tel quel si rien n'a marché
        logDebug('Certificate format not recognized, returning as-is');
        return $cert;
        
    } catch (Exception $e) {
        logError('Failed to format certificate', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Parser les métadonnées IdP
 */
function parseIdPMetadata($metadataXml) {
    try {
        logDebug('Parsing IdP metadata');
        
        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = false;
        if (!@$dom->loadXML($metadataXml)) {
            throw new Exception('Invalid XML metadata');
        }
        
        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('md', 'urn:oasis:names:tc:SAML:2.0:metadata');
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        
        // Extraire le certificat
        $certificates = $xpath->query('//md:IDPSSODescriptor//ds:X509Certificate');
        
        if ($certificates->length === 0) {
            throw new Exception('No X509Certificate found in IdP metadata');
        }
        
        $certificate = trim($certificates->item(0)->textContent);
        logDebug('Certificate extracted from metadata', [
            'raw_size' => strlen($certificate),
            'raw_preview' => substr($certificate, 0, 100),
        ]);
        
        // Normaliser le certificat au format PEM
        $certificate = formatCertificateToPEM($certificate);
        
        logDebug('Certificate after formatting to PEM', [
            'formatted_size' => strlen($certificate),
            'formatted_preview' => substr($certificate, 0, 150),
        ]);
        
        // Chercher le SingleSignOnService
        $ssoServices = $xpath->query('//md:IDPSSODescriptor/md:SingleSignOnService');
        
        $httpPostEntry = null;
        $httpRedirectEntry = null;
        
        for ($i = 0; $i < $ssoServices->length; $i++) {
            $service = $ssoServices->item($i);
            $binding = $service->getAttribute('Binding');
            $location = $service->getAttribute('Location');
            
            if (strpos($binding, 'HTTP-POST') !== false) {
                $httpPostEntry = $location;
                logDebug('HTTP-POST entry point found');
            } elseif (strpos($binding, 'HTTP-Redirect') !== false) {
                $httpRedirectEntry = $location;
                logDebug('HTTP-Redirect entry point found');
            }
        }
        
        $entryPoint = $httpPostEntry ?: $httpRedirectEntry;
        
        if (!$entryPoint) {
            throw new Exception('No SingleSignOnService found in IdP metadata');
        }
        
        logDebug('IdP metadata parsed successfully', [
            'hasCertificate' => !empty($certificate),
            'hasEntryPoint' => !empty($entryPoint),
        ]);
        
        return [
            'certificate' => $certificate,
            'entryPoint' => $entryPoint,
        ];
        
    } catch (Exception $e) {
        logError('Failed to parse IdP metadata', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Récupérer la configuration utilisateur
 */
function getUserConfiguration($email, $config) {
    logDebug('Retrieving user configuration', ['email' => $email]);
    
    // Simulation: retourner une config par défaut
    // À remplacer par une vraie requête base de données
    
    $defaultConfig = [
        'theme' => 'light',
        'language' => 'fr',
        'notifications' => 'enabled',
        'timezone' => 'Europe/Paris',
    ];
    
    // Exemple: config spécifique selon l'email
    $customConfigs = [
        'admin@example.com' => [
            'theme' => 'dark',
            'role' => 'admin',
        ],
    ];
    
    if (isset($customConfigs[$email])) {
        return array_merge($defaultConfig, $customConfigs[$email]);
    }
    
    return $defaultConfig;
}

/**
 * Construire une réponse de succès en XML
 */
function createSuccessResponse($userData, $userConfig) {
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><response/>');
    
    $xml->addChild('success', 'true');
    $xml->addChild('timestamp', date('c'));
    
    // Ajouter les infos utilisateur
    $userElement = $xml->addChild('user');
    foreach ($userData as $key => $value) {
        $userElement->addChild($key, htmlspecialchars($value));
    }
    
    // Ajouter la configuration
    $configElement = $xml->addChild('config');
    foreach ($userConfig as $key => $value) {
        $configElement->addChild($key, htmlspecialchars($value));
    }
    
    return $xml->asXML();
}

/**
 * Construire une réponse d'erreur en XML
 */
function createErrorResponse($message) {
    $xml = new SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><response/>');
    
    $xml->addChild('success', 'false');
    $xml->addChild('timestamp', date('c'));
    $xml->addChild('error', htmlspecialchars($message));
    
    return $xml->asXML();
}

/**
 * Logger les messages de debug
 */
function logDebug($message, $data = null) {
    $config = getConfig();
    if ($config['api']['debug']) {
        log_message('DEBUG', $message, $data);
    }
}

/**
 * Logger les avertissements
 */
function logWarn($message, $data = null) {
    log_message('WARN', $message, $data);
}

/**
 * Logger les erreurs
 */
function logError($message, $data = null) {
    log_message('ERROR', $message, $data);
}

/**
 * Écrire un message de log
 */
function log_message($level, $message, $data = null) {
    $config = getConfig();
    
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $config['api']['logPath'] . '/api.log';
    
    $dataStr = $data ? json_encode($data) : '';
    $logLine = "[$timestamp] [$level] $message $dataStr\n";
    
    file_put_contents($logFile, $logLine, FILE_APPEND);
}

/**
 * Ensurer que les dossiers existent
 */
function ensureDirectories() {
    $config = getConfig();
    
    if (!is_dir($config['api']['logPath'])) {
        mkdir($config['api']['logPath'], 0755, true);
    }
    if (!is_dir($config['api']['metadataCachePath'])) {
        mkdir($config['api']['metadataCachePath'], 0755, true);
    }
}

/**
 * Configurer les headers CORS et Content-Type
 */
function setCORSHeaders($contentType = 'application/xml') {
    header('Content-Type: ' . $contentType . '; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

/**
 * Gérer les requêtes OPTIONS (CORS preflight)
 */
function handleCORS() {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

/**
 * Vérifier la méthode POST
 */
function requirePOST() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo createErrorResponse('Method not allowed. Use POST.');
        exit();
    }
}
