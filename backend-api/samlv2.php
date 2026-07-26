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
 * Vérifier la signature XML SAML avec OpenSSL manuel
 */
function verifySAMLSignature($responseXml, $cert) {
    try {
        logDebug('TRACE-200: verifySAMLSignature() CALLED - Manual OpenSSL verification');
        
        // Parse the Response XML
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
        
        // Extract Assertion XML (without extra formatting)
        $assertionXml = $dom->saveXML($assertion);
        logDebug('TRACE-204: Assertion XML extracted', ['size' => strlen($assertionXml)]);
        
        // Find Signature element
        $signatureList = $assertion->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
        if ($signatureList->length === 0) {
            throw new Exception('No Signature found in Assertion');
        }
        $signature = $signatureList->item(0);
        logDebug('TRACE-205: Signature element found');
        
        // Extract DigestValue (what the Assertion SHOULD hash to)
        logDebug('TRACE-206: Extracting DigestValue');
        $digestValueList = $signature->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'DigestValue');
        if ($digestValueList->length === 0) {
            throw new Exception('No DigestValue in signature');
        }
        $expectedDigest = base64_decode($digestValueList->item(0)->textContent);
        logDebug('TRACE-207: DigestValue extracted', ['size' => strlen($expectedDigest)]);
        
        // Extract SignatureValue (the actual signature)
        logDebug('TRACE-208: Extracting SignatureValue');
        $sigValueList = $signature->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignatureValue');
        if ($sigValueList->length === 0) {
            throw new Exception('No SignatureValue in signature');
        }
        $signatureValue = base64_decode($sigValueList->item(0)->textContent);
        logDebug('TRACE-209: SignatureValue extracted', ['size' => strlen($signatureValue)]);
        
        // For digest validation, we need:
        // 1. Clone the Assertion
        // 2. Remove the Signature element (enveloped-signature transform)
        // 3. Canonicalize with exc-c14n
        // 4. Calculate SHA256 on the canonicalized content
        logDebug('TRACE-210: Cloning Assertion for digest calculation');
        $assertionForDigest = clone $assertion;
        
        // Remove Signature from the clone
        $signaturesToRemove = $assertionForDigest->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');
        for ($i = $signaturesToRemove->length - 1; $i >= 0; $i--) {
            $sig = $signaturesToRemove->item($i);
            $sig->parentNode->removeChild($sig);
        }
        logDebug('TRACE-211: Signature removed from clone');
        
        // Canonicalize the Assertion (without Signature) using Exclusive C14N
        // Create a temporary DOM just for this Assertion to canonicalize it
        $tempDoc = new DOMDocument();
        $tempDoc->preserveWhiteSpace = true;
        $importedAssertion = $tempDoc->importNode($assertionForDigest, true);
        $tempDoc->appendChild($importedAssertion);
        
        $canonicalAssertion = $tempDoc->C14N(false, true);
        logDebug('TRACE-212: Assertion canonicalized with exc-c14n', ['size' => strlen($canonicalAssertion)]);
        
        // Calculate SHA256 digest of the canonicalized Assertion
        logDebug('TRACE-213: Calculating SHA256 digest of canonicalized Assertion');
        $calculatedDigest = hash('sha256', $canonicalAssertion, true);
        logDebug('TRACE-214: Digest calculated', ['size' => strlen($calculatedDigest)]);
        
        // Verify digest matches
        if ($calculatedDigest !== $expectedDigest) {
            logDebug('TRACE-215: Digest mismatch! Expected: ' . bin2hex($expectedDigest) . ', Got: ' . bin2hex($calculatedDigest));
            throw new Exception('Assertion digest does not match signature');
        }
        logDebug('TRACE-216: Digest verified successfully');
        
        // Now verify the signature with OpenSSL
        // First, extract the SignedInfo element
        logDebug('TRACE-217: Extracting SignedInfo');
        $signedInfoList = $signature->getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'SignedInfo');
        if ($signedInfoList->length === 0) {
            throw new Exception('No SignedInfo in signature');
        }
        
        $signedInfo = $signedInfoList->item(0);
        logDebug('TRACE-218: SignedInfo element found');
        
        // Canonicalize SignedInfo using exc-c14n
        // Create a temporary DOM for SignedInfo canonicalization
        $tempDoc2 = new DOMDocument();
        $tempDoc2->preserveWhiteSpace = true;
        $importedSignedInfo = $tempDoc2->importNode($signedInfo, true);
        $tempDoc2->appendChild($importedSignedInfo);
        
        $canonicalSignedInfo = $tempDoc2->C14N(false, true);
        logDebug('TRACE-219: SignedInfo canonicalized with exc-c14n', ['size' => strlen($canonicalSignedInfo)]);
        
        // Extract public key from certificate
        logDebug('TRACE-220: Extracting public key from certificate');
        $publicKey = openssl_get_publickey($cert);
        if (!$publicKey) {
            throw new Exception('Failed to extract public key from certificate');
        }
        logDebug('TRACE-221: Public key extracted');
        
        // Verify signature using OpenSSL
        logDebug('TRACE-222: Verifying signature with openssl_verify');
        $verifyResult = openssl_verify($canonicalSignedInfo, $signatureValue, $publicKey, OPENSSL_ALGO_SHA256);
        logDebug('TRACE-223: Signature verification result', ['result' => $verifyResult]);
        
        openssl_free_key($publicKey);
        
        if ($verifyResult !== 1) {
            logDebug('TRACE-299: ❌ Signature verification failed', ['result' => $verifyResult]);
            throw new Exception('OpenSSL signature verification failed (result: ' . $verifyResult . ')');
        }
        
        logDebug('TRACE-299: ✅ Signature verification successful');
        return true;
    } catch (Exception $e) {
        logError('Signature verification error', ['error' => $e->getMessage(), 'file' => $e->getFile(), 'line' => $e->getLine()]);
        throw $e;
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
