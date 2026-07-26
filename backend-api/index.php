<?php
// Charger l'autoloader Composer
require_once __DIR__ . '/vendor/autoload.php';

use RobRichards\XMLSecLibs\XMLSecurityDSig;
use RobRichards\XMLSecLibs\XMLSecurityKey;

/**
 * Endpoint unique de validation SAML
 * 
 * POST /api/auth/validate
 * 
 * Reçoit:
 * {
 *   "assertion": "<?xml version=\"1.0\"...>...",  // Assertion SAML brute (XML)
 *   "user": {
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 * 
 * Retourne:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <response>
 *   <success>true</success>
 *   <user>
 *     <name>John Doe</name>
 *     <email>john@example.com</email>
 *   </user>
 *   <config>
 *     <theme>dark</theme>
 *     <language>fr</language>
 *   </config>
 * </response>
 */

header('Content-Type: application/xml; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Accepter uniquement POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo createErrorResponse('Method not allowed. Use POST.');
    exit();
}

// Charger la config
$config = require __DIR__ . '/config.php';

// Créer les dossiers de logs et cache s'ils n'existent pas
if (!is_dir($config['api']['logPath'])) {
    mkdir($config['api']['logPath'], 0755, true);
}
if (!is_dir($config['api']['metadataCachePath'])) {
    mkdir($config['api']['metadataCachePath'], 0755, true);
}

try {
    // Récupérer et parser le JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    logDebug('Received request', $input);
    
    // Valider la présence de l'assertion et des données utilisateur
    if (empty($input['assertion'])) {
        throw new Exception('Missing SAML assertion');
    }
    
    if (empty($input['user'])) {
        throw new Exception('Missing user data');
    }
    
    $assertionXml = $input['assertion'];
    $userData = $input['user'];
    
    // DEBUG: Log l'assertion reçue AVANT validation
    logDebug('Received assertion XML (first 800 chars)', [
        'length' => strlen($assertionXml),
        'preview' => substr($assertionXml, 0, 800)
    ]);
    
    // Valider l'assertion SAML
    $validationResult = validateSAMLAssertion($assertionXml, $config);
    
    if (!$validationResult['valid']) {
        throw new Exception('SAML assertion validation failed: ' . $validationResult['error']);
    }
    
    logDebug('SAML assertion validated', $validationResult['profile']);
    
    // Récupérer la configuration utilisateur
    $userConfig = getUserConfiguration($userData['email'], $config);
    
    // Construire la réponse XML
    $response = createSuccessResponse($userData, $userConfig);
    
    http_response_code(200);
    echo $response;
    
} catch (Exception $e) {
    logError('Validation failed', ['error' => $e->getMessage()]);
    http_response_code(400);
    echo createErrorResponse($e->getMessage());
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
        
        return $certificateContent;
        
    } catch (Exception $e) {
        logError('Failed to download certificate', ['error' => $e->getMessage()]);
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
        
        $metadata = @file_get_contents($metadataUrl, false, $context);
        
        if (!$metadata) {
            throw new Exception("Cannot fetch metadata from: $metadataUrl");
        }
        
        // Valider le XML
        $dom = new DOMDocument();
        if (!@$dom->loadXML($metadata)) {
            throw new Exception('Invalid XML in metadata');
        }
        
        // Mettre en cache
        file_put_contents($cacheFile, $metadata);
        logDebug('Metadata cached successfully');
        
        return $metadata;
        
    } catch (Exception $e) {
        logError('Failed to get IdP metadata', ['error' => $e->getMessage()]);
        throw $e;
    }
}

/**
 * Parser les métadonnées IdP et extraire certificat + entryPoint
 */
function parseIdPMetadata($metadataXml) {
    try {
        $dom = new DOMDocument();
        if (!@$dom->loadXML($metadataXml)) {
            throw new Exception('Invalid XML in metadata');
        }
        
        // Chercher EntityDescriptor
        $entityDescriptors = $dom->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'EntityDescriptor');
        
        if ($entityDescriptors->length === 0) {
            throw new Exception('No EntityDescriptor found in metadata');
        }
        
        $entityDescriptor = $entityDescriptors->item(0);
        
        // Chercher IDPSSODescriptor
        $idpSsoDescriptors = $entityDescriptor->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'IDPSSODescriptor');
        
        if ($idpSsoDescriptors->length === 0) {
            throw new Exception('No IDPSSODescriptor found in metadata');
        }
        
        $idpSsoDescriptor = $idpSsoDescriptors->item(0);
        
        // Extraire le certificat
        $certificate = '';
        $keyDescriptors = $idpSsoDescriptor->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'KeyDescriptor');
        
        foreach ($keyDescriptors as $keyDesc) {
            $keyInfo = $keyDesc->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'KeyInfo');
            if ($keyInfo->length > 0) {
                $x509Data = $keyInfo->item(0)->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Data');
                if ($x509Data->length > 0) {
                    $x509Cert = $x509Data->item(0)->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'X509Certificate');
                    if ($x509Cert->length > 0) {
                        $certificate = trim($x509Cert->item(0)->textContent);
                        logDebug('Certificate extracted from metadata');
                        break;
                    }
                }
            }
        }
        
        if (!$certificate) {
            throw new Exception('No X509Certificate found in metadata');
        }
        
        // Extraire l'entryPoint (SingleSignOnService)
        $entryPoint = '';
        $ssoServices = $idpSsoDescriptor->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:metadata', 'SingleSignOnService');
        
        foreach ($ssoServices as $ssoService) {
            $binding = $ssoService->getAttribute('Binding');
            $location = $ssoService->getAttribute('Location');
            
            // Préférer HTTP-Redirect
            if (strpos($binding, 'HTTP-Redirect') !== false) {
                $entryPoint = $location;
                logDebug('HTTP-Redirect entry point found');
                break;
            }
            
            // Sinon HTTP-POST
            if (!$entryPoint && strpos($binding, 'HTTP-POST') !== false) {
                $entryPoint = $location;
                logDebug('HTTP-POST entry point found');
            }
        }
        
        if (!$entryPoint) {
            throw new Exception('No SingleSignOnService found in metadata');
        }
        
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
 * Valider l'assertion SAML
 */
function validateSAMLAssertion($assertionXml, $config) {
    try {
        logDebug('Starting SAML assertion validation');
        
        // Parser le XML complet (Response ou Assertion)
        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = true;  // IMPORTANT: préserver les espaces pour canonicalization
        if (!@$dom->loadXML($assertionXml)) {
            throw new Exception('Invalid XML format');
        }
        
        logDebug('XML parsed successfully');
        
        // Chercher une Assertion n'importe où dans le document
        $assertions = $dom->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion');
        
        if ($assertions->length === 0) {
            throw new Exception('No SAML Assertion found');
        }
        
        logDebug('SAML Assertion found', ['count' => $assertions->length]);
        $assertion = $assertions->item(0);
        
        // Extraire JUSTE l'élément Assertion (pas la réponse entière)
        // pour que xmlsec1 puisse le vérifier correctement
        $assertionXmlOnly = $dom->saveXML($assertion);
        logDebug('Extracted Assertion XML for signature verification', [
            'size' => strlen($assertionXmlOnly),
            'preview' => substr($assertionXmlOnly, 0, 200),
        ]);
        
        // Récupérer le certificat IdP avec la bonne source (priorité: metadata > certificateUrl > certificateFilePath)
        $certificateSource = getIdPCertificateWithSource($config);
        logDebug('Certificate source', [
            'type' => $certificateSource['type'],
            'source' => $certificateSource['source'],
        ]);
        
        $idpCert = null;
        
        // Si c'est des métadonnées, extraire le certificat
        if ($certificateSource['type'] === 'metadata') {
            logDebug('Parsing IdP metadata');
            $idpMetadata = parseIdPMetadata($certificateSource['content']);
            logDebug('IdP metadata parsed successfully', [
                'hasCertificate' => !!$idpMetadata['certificate'],
                'hasEntryPoint' => !!$idpMetadata['entryPoint'],
            ]);
            $idpCert = $idpMetadata['certificate'];
        } else {
            // Si c'est un certificat direct (URL ou fichier)
            logDebug('Using direct certificate');
            $idpCert = $certificateSource['content'];
        }
        
        if (empty($idpCert)) {
            throw new Exception('No IdP certificate found');
        }
        
        logDebug('Certificate loaded before signature verification', [
            'size' => strlen($idpCert),
            'preview' => substr($idpCert, 0, 150),
        ]);
        
        // Vérifier la signature avec le certificat IdP
        logDebug('Verifying SAML assertion signature');
        if (!verifySignature($dom, $idpCert, $assertionXml)) {
            throw new Exception('SAML assertion signature validation failed');
        }
        
        logDebug('SAML signature verified successfully');
        
        // Extraire les attributs utilisateur de l'assertion
        $profile = extractProfile($assertion);
        logDebug('User profile extracted', ['email' => $profile['email'] ?? 'N/A']);
        
        return [
            'valid' => true,
            'profile' => $profile,
        ];
        
    } catch (Exception $e) {
        logError('SAML assertion validation error', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        return [
            'valid' => false,
            'error' => $e->getMessage(),
        ];
    }
}

/**
 * Vérifier la signature XML avec xmlsec1 en ligne de commande
 */
function verifySignature($dom, $cert, $assertionXml = '') {
    try {
        logDebug('=== SIGNATURE VERIFICATION WITH XMLSEC1 CLI ===');
        
        // ÉTAPE 0: Sauvegarder le certificat IdP dans un fichier temporaire
        logDebug('STEP 0: Save IdP certificate to temp file');
        
        $tempCertFile = tempnam(sys_get_temp_dir(), 'saml_cert_');
        file_put_contents($tempCertFile, $cert);
        
        logDebug('IdP certificate saved', [
            'file' => $tempCertFile,
            'size' => filesize($tempCertFile),
            'preview' => substr($cert, 0, 100),
        ]);
        
        // ÉTAPE 0: Sauvegarder le certificat IdP dans un fichier temporaire
        logDebug('STEP 0: Save IdP certificate to temp file');
        
        $tempCertFile = tempnam(sys_get_temp_dir(), 'saml_cert_');
        file_put_contents($tempCertFile, $cert);
        
        logDebug('IdP certificate saved', [
            'file' => $tempCertFile,
            'size' => filesize($tempCertFile),
        ]);
        
        // ÉTAPE 1: Sauvegarder l'assertion dans un fichier temporaire
        logDebug('STEP 1: Save assertion to temp file');
        
        $tempAssertionFile = tempnam(sys_get_temp_dir(), 'saml_assertion_');
        file_put_contents($tempAssertionFile, $assertionXml);
        
        logDebug('Assertion saved', [
            'file' => $tempAssertionFile,
            'size' => filesize($tempAssertionFile),
        ]);
        
        // ÉTAPE 2: Utiliser xmlsec1 pour vérifier la signature avec le certificat de confiance
        // L'option --trusted-pem passe le certificat IdP à utiliser pour la vérification
        logDebug('STEP 2: Verify signature with xmlsec1 --verify using --trusted-pem');
        
        $cmd = "/usr/bin/xmlsec1 verify --insecure --trusted-pem " . escapeshellarg($tempCertFile) . " " . escapeshellarg($tempAssertionFile) . " 2>&1";
        
        logDebug('Executing xmlsec1 command', [
            'cmd' => '/usr/bin/xmlsec1 --insecure --trusted-pem [CERT_FILE] verify [ASSERTION_FILE]'
        ]);
        
        $output = shell_exec($cmd);
        
        logDebug('xmlsec1 output', ['output' => $output]);
        
        // Analyser le résultat - xmlsec1 retourne 0 en succès
        $returnCode = 0;
        $verifyCmd = "(/usr/bin/xmlsec1 verify --insecure --trusted-pem " . escapeshellarg($tempCertFile) . " " . escapeshellarg($tempAssertionFile) . ") 2>&1; echo $?";
        $outputWithCode = shell_exec($verifyCmd);
        $lines = explode("\n", trim($outputWithCode));
        $lastLine = end($lines);
        if (is_numeric($lastLine)) {
            $returnCode = intval($lastLine);
        }
        
        logDebug('xmlsec1 return code', ['returnCode' => $returnCode]);
        
        // Nettoyer les fichiers temporaires
        @unlink($tempAssertionFile);
        @unlink($tempCertFile);
        
        // Vérifier uniquement le return code (0 = succès, non-zéro = erreur)
        if ($returnCode === 0) {
            logDebug('✅ SIGNATURE VERIFICATION SUCCESSFUL with xmlsec1!');
            return true;
        } else {
            logError('❌ Signature verification FAILED with xmlsec1', [
                'returnCode' => $returnCode,
                'output' => $output,
            ]);
            return false;
        }
        
    } catch (Exception $e) {
        logError('Signature verification exception', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        return false;
    }
}

/**
 * Extraire le profil utilisateur de l'assertion
 */
function extractProfile($assertion) {
    $profile = [];
    
    logDebug('Extracting user profile from assertion');
    
    // Récupérer les attributs SAML
    $attributes = $assertion->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute');
    
    logDebug('Attributes found', ['count' => $attributes->length]);
    
    foreach ($attributes as $attr) {
        $name = $attr->getAttribute('Name');
        $values = $attr->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue');
        
        if ($values->length > 0) {
            $value = $values->item(0)->textContent;
            $profile[$name] = $value;
            logDebug('Attribute extracted', ['name' => $name, 'valueLength' => strlen($value)]);
        }
    }
    
    return $profile;
}

/**
 * Parser les informations de signature
 */
function parseSignature($dom, $signatureElement) {
    try {
        // Extraire le SignatureValue
        $signatureValues = $signatureElement->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
        if ($signatureValues->length === 0) {
            return false;
        }
        
        $signatureValue = base64_decode($signatureValues->item(0)->textContent);
        
        // Pour SimpleSAML: extraire le contenu signé (normalement c'est le parent de Signature)
        $parent = $signatureElement->parentNode;
        if (!$parent) {
            return false;
        }
        
        // La partie signée est généralement tout sauf l'élément Signature lui-même
        $signedInfo = $dom->saveXML($parent);
        
        return [
            'signedInfo' => $signedInfo,
            'signatureValue' => $signatureValue,
        ];
        
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Récupérer la configuration utilisateur
 * 
 * À adapter selon votre base de données
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
    $config = require __DIR__ . '/config.php';
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
    $config = require __DIR__ . '/config.php';
    
    $timestamp = date('Y-m-d H:i:s');
    $logFile = $config['api']['logPath'] . '/api.log';
    
    $dataStr = $data ? json_encode($data) : '';
    $logLine = "[$timestamp] [$level] $message $dataStr\n";
    
    file_put_contents($logFile, $logLine, FILE_APPEND);
}
