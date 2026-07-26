<?php
require_once __DIR__ . '/functions.php';

// 🚨🚨🚨 ULTRA DEBUG: Very first line of samlv2.php - if you see this, file is loaded!
logDebug('🚨🚨🚨 [samlv2.php LINE 2] FILE IS LOADING - OPENSSL VERSION 2026-07-26');

/**
 * Endpoint de validation SAML v2
 * 
 * POST /api/auth/validate/saml
 */

// FORCE CLEAR OPCACHE - This file should never be cached
if (function_exists('opcache_reset')) {
    opcache_reset();
}

setCORSHeaders();
handleCORS();
requirePOST();

ensureDirectories();

try {
    $config = getConfig();
    
    // Récupérer et parser le JSON
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception('Invalid JSON input');
    }
    
    logDebug('Received SAML validation request', ['has_assertion' => !empty($input['assertion']), 'has_user' => !empty($input['user'])]);
    
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
    logDebug('Received SAML assertion XML (first 800 chars)', [
        'length' => strlen($assertionXml),
        'preview' => substr($assertionXml, 0, 800)
    ]);
    
    // Valider l'assertion SAML
    logDebug('TRACE-001: About to validate SAML assertion');
    $validationResult = validateSAMLAssertion($assertionXml, $config);
    logDebug('TRACE-002: SAML assertion validation returned with result', ['valid' => $validationResult['valid'] ?? 'unknown']);
    
    if (!$validationResult['valid']) {
        throw new Exception('SAML assertion validation failed: ' . $validationResult['error']);
    }
    
    logDebug('TRACE-003: Validation passed');
    logDebug('SAML assertion validated', $validationResult['profile']);
    
    // Récupérer la configuration utilisateur
    $userConfig = getUserConfiguration($userData['email'], $config);
    
    // Construire la réponse XML
    $response = createSuccessResponse($userData, $userConfig);
    
    http_response_code(200);
    echo $response;
    
} catch (Exception $e) {
    logError('SAML validation failed', ['error' => $e->getMessage()]);
    http_response_code(400);
    echo createErrorResponse($e->getMessage());
}

/**
 * Valider l'assertion SAML
 */
function validateSAMLAssertion($assertionXml, $config) {
    // 🚨 ULTRA DEBUG: This line should ALWAYS appear if function is called
    logDebug('🚨🚨🚨 [validateSAMLAssertion] FUNCTION CALLED - LINE 85');
    
    try {
        logDebug('TRACE-100: validateSAMLAssertion() CALLED');
        
        // Parser le XML complet (Response ou Assertion)
        logDebug('TRACE-101: Parsing XML');
        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = true;
        if (!@$dom->loadXML($assertionXml)) {
            throw new Exception('Invalid XML format');
        }
        
        logDebug('TRACE-102: XML parsed successfully');
        
        // Chercher une Assertion
        logDebug('TRACE-103: Looking for Assertion elements');
        $assertions = $dom->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion');
        
        if ($assertions->length === 0) {
            throw new Exception('No SAML Assertion found');
        }
        
        logDebug('TRACE-104: SAML Assertion found', ['count' => $assertions->length]);
        $assertion = $assertions->item(0);
        
        // Extraire JUSTE l'élément Assertion
        logDebug('TRACE-105: Extracting Assertion XML');
        $assertionXmlOnly = $dom->saveXML($assertion);
        logDebug('TRACE-106: Assertion XML extracted', [
            'size' => strlen($assertionXmlOnly),
            'preview' => substr($assertionXmlOnly, 0, 200),
        ]);
        
        // Récupérer le certificat
        logDebug('TRACE-107: Getting IdP certificate');
        $certificateSource = getIdPCertificateWithSource($config);
        logDebug('TRACE-108: Certificate source retrieved', [
            'type' => $certificateSource['type'],
            'source' => $certificateSource['source'],
        ]);
        
        $idpCert = null;
        
        // Si c'est des métadonnées, extraire le certificat
        if ($certificateSource['type'] === 'metadata') {
            logDebug('TRACE-109: Parsing IdP metadata');
            $idpMetadata = parseIdPMetadata($certificateSource['content']);
            logDebug('TRACE-110: IdP metadata parsed successfully', [
                'hasCertificate' => !!$idpMetadata['certificate'],
                'hasEntryPoint' => !!$idpMetadata['entryPoint'],
            ]);
            $idpCert = $idpMetadata['certificate'];
        } else {
            // Si c'est un certificat direct (URL ou fichier)
            logDebug('TRACE-111: Using direct certificate');
            $idpCert = $certificateSource['content'];
        }
        
        if (empty($idpCert)) {
            throw new Exception('No IdP certificate found');
        }
        
        logDebug('TRACE-112: Certificate loaded before signature verification', [
            'size' => strlen($idpCert),
            'preview' => substr($idpCert, 0, 150),
        ]);
        
        // Vérifier la signature
        logDebug('TRACE-113: About to call verifySAMLSignature');
        if (!verifySAMLSignature($assertionXml, $idpCert)) {
            logDebug('TRACE-114: verifySAMLSignature returned FALSE');
            throw new Exception('SAML assertion signature validation failed');
        }
        logDebug('TRACE-115: verifySAMLSignature returned TRUE');
        
        logDebug('TRACE-116: Extracting user profile');
        $profile = extractSAMLProfile($assertion);
        logDebug('TRACE-117: User profile extracted', ['email' => $profile['email'] ?? 'N/A']);
        
        logDebug('TRACE-118: Returning valid result');
        return [
            'valid' => true,
            'profile' => $profile,
        ];
        
    } catch (Exception $e) {
        logDebug('TRACE-199: Exception caught in validateSAMLAssertion');
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
 * Vérifier la signature XML SAML
 */
function verifySAMLSignature($responseXml, $cert) {
    try {
        logDebug('TRACE-200: verifySAMLSignature() CALLED - XMLSecurityDSig on Assertion ONLY');
        
        require_once __DIR__ . '/vendor/robrichards/xmlseclibs/xmlseclibs.php';
        
        // Parse the Response XML to extract the Assertion
        logDebug('TRACE-201: Parsing Response XML');
        $dom = new DOMDocument();
        $dom->preserveWhiteSpace = true;
        $dom->loadXML($responseXml);
        
        logDebug('TRACE-202: Finding Assertion element');
        $xpath = new DOMXPath($dom);
        $xpath->registerNamespace('saml', 'urn:oasis:names:tc:SAML:2.0:assertion');
        $xpath->registerNamespace('ds', 'http://www.w3.org/2000/09/xmldsig#');
        
        $assertions = $xpath->query('//saml:Assertion');
        if ($assertions->length === 0) {
            throw new Exception('No Assertion found in Response');
        }
        
        logDebug('TRACE-203: Assertion found');
        $assertion = $assertions->item(0);
        
        // Create a new DOM with just the Assertion
        logDebug('TRACE-204: Creating DOM with Assertion only');
        $assertionDom = new DOMDocument();
        $assertionDom->preserveWhiteSpace = true;
        $assertionDom->loadXML($dom->saveXML($assertion));
        
        logDebug('TRACE-205: Loading certificate');
        $certificateContent = $cert;
        
        // Create XMLSecurityDSig instance
        logDebug('TRACE-206: Creating XMLSecurityDSig instance');
        $objDSig = new \RobRichards\XMLSecLibs\XMLSecurityDSig();
        
        // Register ID attribute
        logDebug('TRACE-207: Registering ID attribute');
        $objDSig->idKeys = array('ID');
        $objDSig->idNS = array(
            'saml' => 'urn:oasis:names:tc:SAML:2.0:assertion'
        );
        
        // Locate and validate signature
        logDebug('TRACE-208: Locating signature in Assertion');
        $objDSig->locateSignature($assertionDom);
        
        if (!$objDSig->validateReference()) {
            throw new Exception('Reference validation failed');
        }
        
        logDebug('TRACE-209: Reference validated, verifying signature');
        
        // Get the key from certificate
        $objKey = new \RobRichards\XMLSecLibs\XMLSecurityKey(\RobRichards\XMLSecLibs\XMLSecurityKey::RSA_SHA256, array('type' => 'public'));
        $objKey->loadKey($certificateContent, false, true);
        
        // Verify the signature
        logDebug('TRACE-210: Verifying signature with certificate');
        $objDSig->verify($objKey);
        
        logDebug('TRACE-299: ✅ SAML Signature verification SUCCESSFUL!');
        return true;
        
    } catch (Exception $e) {
        logDebug('TRACE-298: ❌ Signature verification failed');
        logError('Signature verification error', [
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ]);
        return false;
    }
}

/**
 * Extraire le profil utilisateur de l'assertion SAML
 */
function extractSAMLProfile($assertion) {
    $profile = [];
    
    // Extraire le NameID
    $nameIds = $assertion->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'NameID');
    
    if ($nameIds->length > 0) {
        $profile['nameId'] = $nameIds->item(0)->textContent;
    }
    
    // Extraire les Attributes
    $attributes = $assertion->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute');
    
    logDebug('SAML Attributes found', ['count' => $attributes->length]);
    
    foreach ($attributes as $attr) {
        $name = $attr->getAttribute('Name');
        $values = $attr->getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue');
        
        if ($values->length > 0) {
            $value = $values->item(0)->textContent;
            $profile[$name] = $value;
            logDebug('SAML Attribute extracted', ['name' => $name, 'valueLength' => strlen($value)]);
        }
    }
    
    return $profile;
}
