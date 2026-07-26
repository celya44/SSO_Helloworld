"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.getSAMLLoginURL = exports.initSAMLServer = exports.setAuthWindow = void 0;
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const SamlStrategy = __importStar(require("passport-saml"));
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app = (0, express_1.default)();
const SAML_PORT = 3001;
// Store for the authentication windows
let mainWindow = null; // Fenêtre principale de l'app
let authWindow = null; // Fenêtre popup d'authentification
let currentUser = null;
let serverInitialized = false; // Flag pour éviter les initialisations multiples
let currentSAMLAssertion = null; // Stocker l'assertion SAML brute
let samlValidateUrl = null; // URL pour valider les assertions SAML
// IMPORTANT: Enregistrer les middlewares AVANT les routes
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use(express_1.default.text({ type: 'text/xml' }));
// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
});
/**
 * Enregistrer la fenêtre d'authentification (popup)
 */
function setAuthWindow(window) {
    authWindow = window;
    console.log('Auth window registered:', window ? 'set' : 'cleared');
}
exports.setAuthWindow = setAuthWindow;
/**
 * Télécharge et parse les métadonnées SAML de l'IdP
 */
async function fetchSAMLMetadata(metadataUrl) {
    try {
        console.log(`Fetching SAML metadata from: ${metadataUrl}`);
        const response = await axios_1.default.get(metadataUrl);
        const metadata = await (0, xml2js_1.parseStringPromise)(response.data);
        console.log('Metadata keys:', Object.keys(metadata));
        // Chercher EntityDescriptor (peut avoir préfixe namespace md:)
        let entityDescriptor = metadata.EntityDescriptor || metadata['md:EntityDescriptor'];
        if (Array.isArray(entityDescriptor)) {
            entityDescriptor = entityDescriptor[0];
        }
        if (!entityDescriptor) {
            console.error('Available keys:', Object.keys(metadata));
            throw new Error('EntityDescriptor not found in metadata');
        }
        console.log('EntityDescriptor keys:', Object.keys(entityDescriptor));
        // Chercher IDPSSODescriptor (peut avoir préfixe namespace md:)
        let idpSsoDescriptors = entityDescriptor.IDPSSODescriptor || entityDescriptor['md:IDPSSODescriptor'];
        if (!idpSsoDescriptors) {
            console.error('IDPSSODescriptor not found. Available keys:', Object.keys(entityDescriptor));
            throw new Error('IDPSSODescriptor not found in metadata');
        }
        const idpSsoDescriptor = Array.isArray(idpSsoDescriptors)
            ? idpSsoDescriptors[0]
            : idpSsoDescriptors;
        console.log('IDPSSODescriptor found with keys:', Object.keys(idpSsoDescriptor));
        // Extraire le certificat (peut avoir préfixe namespace md: ou ds:)
        let certificate;
        let keyDescriptors = idpSsoDescriptor.KeyDescriptor || idpSsoDescriptor['md:KeyDescriptor'] || [];
        if (!Array.isArray(keyDescriptors)) {
            keyDescriptors = [keyDescriptors];
        }
        for (const keyDesc of keyDescriptors) {
            // Chercher ds:KeyInfo
            let keyInfo = keyDesc.KeyInfo || keyDesc['ds:KeyInfo'];
            if (Array.isArray(keyInfo)) {
                keyInfo = keyInfo[0];
            }
            // Chercher ds:X509Data
            let x509Data = keyInfo?.X509Data || keyInfo?.['ds:X509Data'];
            if (Array.isArray(x509Data)) {
                x509Data = x509Data[0];
            }
            // Chercher ds:X509Certificate
            let x509Cert = x509Data?.X509Certificate || x509Data?.['ds:X509Certificate'];
            if (Array.isArray(x509Cert)) {
                x509Cert = x509Cert[0];
            }
            if (x509Cert) {
                certificate = x509Cert;
                console.log('Certificate found');
                break;
            }
        }
        if (!certificate) {
            console.warn('No X509Certificate found in metadata');
        }
        // Extraire SingleSignOnService
        let entryPoint;
        let singleSignOnServices = idpSsoDescriptor.SingleSignOnService || idpSsoDescriptor['md:SingleSignOnService'] || [];
        if (!Array.isArray(singleSignOnServices)) {
            singleSignOnServices = [singleSignOnServices];
        }
        console.log(`Found ${singleSignOnServices.length} SingleSignOnService(s)`);
        for (const ssoService of singleSignOnServices) {
            // Extraire Binding et Location (peuvent avoir $. pour les attributs)
            const binding = ssoService.Binding?.[0] || ssoService.$?.Binding || ssoService['Binding'];
            const location = ssoService.Location?.[0] || ssoService.$?.Location || ssoService['Location'];
            console.log('SSO Service - Binding:', binding, 'Location:', location);
            // Chercher HTTP-Redirect de préférence
            if (binding && binding.includes('HTTP-Redirect')) {
                entryPoint = location;
                console.log('Found HTTP-Redirect entry point:', entryPoint);
                break;
            }
            // Sinon, prendre le premier
            if (!entryPoint && location) {
                entryPoint = location;
                console.log('Using first entry point:', entryPoint);
            }
        }
        if (!entryPoint) {
            throw new Error('SingleSignOnService Location not found in metadata');
        }
        console.log('SAML Metadata parsed successfully:', {
            hasCertificate: !!certificate,
            entryPoint: entryPoint,
        });
        return {
            certificate: certificate ? `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----` : undefined,
            entryPoint: entryPoint,
        };
    }
    catch (error) {
        console.error('Failed to fetch SAML metadata:', error);
        throw error;
    }
}
/**
 * Charge un certificat soit depuis une URL soit depuis un chemin de fichier local
 * @param certificateSource - URL (http:// ou https://) ou chemin local au fichier du certificat
 * @returns Le certificat au format PEM
 */
async function loadCertificate(certificateSource) {
    if (!certificateSource) {
        throw new Error('Certificate source is empty');
    }
    try {
        // Vérifier si c'est une URL
        if (certificateSource.startsWith('http://') || certificateSource.startsWith('https://')) {
            console.log(`📥 Loading certificate from URL: ${certificateSource}`);
            const response = await axios_1.default.get(certificateSource, {
                timeout: 10000,
            });
            let cert = response.data;
            // Si le certificat n'a pas les en-têtes PEM, les ajouter
            if (!cert.includes('BEGIN CERTIFICATE')) {
                cert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
            }
            console.log('✅ Certificate loaded from URL');
            return cert;
        }
        else {
            // C'est un chemin local
            console.log(`📂 Loading certificate from file: ${certificateSource}`);
            // Supporter les chemins relatifs avec ~ pour le home directory
            let filePath = certificateSource;
            if (filePath.startsWith('~')) {
                const os = require('os');
                filePath = path.join(os.homedir(), filePath.slice(1));
            }
            // Si c'est un chemin relatif, le résoudre depuis le répertoire courant
            if (!path.isAbsolute(filePath)) {
                filePath = path.resolve(process.cwd(), filePath);
            }
            if (!fs.existsSync(filePath)) {
                throw new Error(`Certificate file not found: ${filePath}`);
            }
            let cert = fs.readFileSync(filePath, 'utf-8');
            // Si le certificat n'a pas les en-têtes PEM, les ajouter
            if (!cert.includes('BEGIN CERTIFICATE')) {
                cert = `-----BEGIN CERTIFICATE-----\n${cert}\n-----END CERTIFICATE-----`;
            }
            console.log('✅ Certificate loaded from file');
            return cert;
        }
    }
    catch (error) {
        console.error('❌ Failed to load certificate:', error.message);
        throw new Error(`Failed to load certificate from ${certificateSource}: ${error.message}`);
    }
}
/**
 * Envoyer l'assertion SAML au serveur PHP pour validation
 */
async function validateViaAPI(user, assertion, validateUrl) {
    try {
        console.log(`📤 Sending SAML assertion to ${validateUrl}`);
        console.log(`📋 Assertion length: ${assertion.length} chars`);
        console.log(`👤 User data:`, user);
        const payload = {
            assertion: assertion,
            user: {
                name: user.name,
                email: user.email,
            },
        };
        console.log(`📦 Payload size: ${JSON.stringify(payload).length} bytes`);
        const response = await axios_1.default.post(validateUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 10000, // 10 secondes timeout
        });
        console.log('📥 API Response status:', response.status);
        console.log('📥 API Response data:', response.data);
        // Parser la réponse XML
        const xmlResponse = await (0, xml2js_1.parseStringPromise)(response.data);
        console.log('🔍 Parsed XML response:', JSON.stringify(xmlResponse, null, 2));
        // Vérifier si succès
        const success = xmlResponse.response?.success?.[0] === 'true';
        if (!success) {
            const error = xmlResponse.response?.error?.[0] || 'Unknown error';
            throw new Error(`API validation failed: ${error}`);
        }
        // Extraire les données de la réponse XML
        const userData = xmlResponse.response?.user?.[0] || {};
        const configData = xmlResponse.response?.config?.[0] || {};
        console.log('✅ Validation successful');
        return {
            success: true,
            user: {
                name: userData.name?.[0] || user.name,
                email: userData.email?.[0] || user.email,
            },
            config: Object.keys(configData).reduce((acc, key) => {
                acc[key] = configData[key]?.[0] || '';
                return acc;
            }, {}),
        };
    }
    catch (error) {
        console.error('❌ API validation error:', error.message);
        if (error.response) {
            console.error('📥 API error response:', error.response.data);
            console.error('📥 API error status:', error.response.status);
        }
        throw new Error(`Failed to validate with API: ${error.message}`);
    }
}
/**
 * Configure et lance le serveur SAML
 */
async function initSAMLServer(config, window, appConfig) {
    mainWindow = window; // La fenêtre principale reçoit les messages IPC
    // Stocker l'URL de validation SAML si fournie
    if (config.validateUrl) {
        samlValidateUrl = config.validateUrl;
        console.log('SAML validation enabled:', samlValidateUrl);
    }
    // Si le serveur est déjà initialisé, ne pas refaire la configuration
    if (serverInitialized) {
        console.log('SAML Server already initialized, skipping...');
        return;
    }
    serverInitialized = true;
    try {
        let certificate = undefined;
        let entryPoint = config.entryPoint;
        console.log('Initial config:', {
            certificateFilePath: config.certificateFilePath ? '✓ set' : '✗ empty',
            entryPoint: entryPoint ? '✓ set' : '✗ empty',
            metadataUrl: config.metadataUrl,
        });
        // Si metadataUrl est fourni, télécharger et utiliser les métadonnées
        if (config.metadataUrl) {
            try {
                const metadata = await fetchSAMLMetadata(config.metadataUrl);
                certificate = metadata.certificate || certificate;
                entryPoint = metadata.entryPoint || entryPoint;
                console.log('After metadata fetch:', {
                    certificate: certificate ? '✓ set' : '✗ empty',
                    entryPoint: entryPoint ? '✓ set' : '✗ empty',
                });
            }
            catch (metadataError) {
                console.error('Error fetching metadata (continuing with manual config):', metadataError.message);
                // Continue avec la configuration manuelle
            }
        }
        // Si certificateFilePath est fourni, charger le certificat (URL ou fichier local)
        if (config.certificateFilePath && !certificate) {
            try {
                console.log('Loading certificate from certificateFilePath...');
                certificate = await loadCertificate(config.certificateFilePath);
                console.log('After certificate load:', {
                    certificate: certificate ? '✓ set' : '✗ empty',
                });
            }
            catch (certError) {
                console.error('Error loading certificate:', certError.message);
                throw certError;
            }
        }
        // Configuration de la stratégie SAML - cert doit être défini
        if (!certificate) {
            throw new Error('SAML certificate not found. Please provide metadataUrl or certificateFilePath in sso.ini');
        }
        if (!entryPoint) {
            throw new Error('SAML entryPoint not found. Please provide metadataUrl or entryPoint in sso.ini');
        }
        const samlConfig = {
            path: '/auth/saml/callback',
            entryPoint: entryPoint,
            issuer: config.issuer,
            cert: certificate,
            identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        };
        console.log('SAML Strategy configured:', {
            entryPoint: samlConfig.entryPoint,
            issuer: samlConfig.issuer,
        });
        // Créer la stratégie SAML
        passport_1.default.use('saml', new SamlStrategy.Strategy(samlConfig, (profile, done) => {
            console.log('SAML Profile:', profile);
            const user = {
                name: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']
                    || profile.name
                    || profile['urn:oid:2.5.4.3']
                    || 'Unknown User',
                email: profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']
                    || profile.email
                    || profile['urn:oid:0.9.2342.19200300.100.1.3']
                    || 'unknown@example.com',
                method: 'saml',
                claims: profile,
            };
            return done(null, user);
        }));
        // Sérialiser/désérialiser l'utilisateur
        passport_1.default.serializeUser((user, done) => {
            done(null, user);
        });
        passport_1.default.deserializeUser((user, done) => {
            done(null, user);
        });
        // Middleware pour capturer l'assertion SAML avant Passport
        app.use('/auth/saml/callback', (req, res, next) => {
            if (req.method === 'POST' && req.body.SAMLResponse) {
                // Décoder l'assertion SAML du body
                try {
                    const decodedAssertion = Buffer.from(req.body.SAMLResponse, 'base64').toString('utf-8');
                    currentSAMLAssertion = decodedAssertion;
                    console.log('✅ Captured SAML assertion');
                }
                catch (error) {
                    console.warn('Could not decode SAML assertion:', error);
                }
            }
            next();
        });
        // Route pour initier la connexion SAML
        app.get('/auth/saml', passport_1.default.authenticate('saml', { failureRedirect: '/auth/saml/failure' }));
        // Route de callback SAML
        app.post('/auth/saml/callback', passport_1.default.authenticate('saml', { session: false, failureRedirect: '/auth/saml/failure' }), (req, res) => {
            try {
                console.log('✅ POST /auth/saml/callback received');
                const user = req.user;
                currentUser = user;
                console.log('SAML Authentication successful:', currentUser);
                // Nettoyer l'objet utilisateur pour IPC (supprimer les fonctions)
                // Utiliser JSON.stringify/parse pour supprimer les éléments non-sérialisables
                let claimsData = {};
                try {
                    claimsData = JSON.parse(JSON.stringify(user.claims || {}));
                }
                catch (e) {
                    console.warn('Could not serialize claims:', e);
                    claimsData = {};
                }
                const serializedUser = {
                    name: user.name || 'Unknown User',
                    email: user.email || 'unknown@example.com',
                    method: user.method || 'saml',
                    claims: claimsData,
                };
                console.log('Serialized user for IPC:', serializedUser);
                // Si une URL d'API est configurée, valider l'assertion via l'API PHP
                if (samlValidateUrl && currentSAMLAssertion) {
                    console.log('🔄 Sending SAML assertion to API for validation...');
                    validateViaAPI(serializedUser, currentSAMLAssertion, samlValidateUrl)
                        .then((apiResponse) => {
                        console.log('✅ API validation successful');
                        // Envoyer les infos à la fenêtre principale (pour mettre à jour l'UI)
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('auth:saml-success', apiResponse);
                            console.log('✅ Sent auth:saml-success to main window');
                        }
                    })
                        .catch((error) => {
                        console.error('❌ API validation failed:', error);
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('auth:saml-error', {
                                success: false,
                                error: error.message,
                            });
                        }
                    });
                }
                else {
                    // Envoyer directement sans validation API
                    console.log('⏭️  No API configured, sending user data directly');
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('auth:saml-success', {
                            success: true,
                            user: serializedUser,
                        });
                        console.log('✅ Sent auth:saml-success to main window');
                    }
                }
                // Répondre avec une page de succès
                const html = `
            <html>
              <head>
                <title>Authentication Successful</title>
                <style>
                  body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                  .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
                  h1 { color: #333; margin: 0 0 10px 0; }
                  p { color: #666; margin: 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>✅ Authentication Successful!</h1>
                  <p>Welcome, ${user.name || 'User'}!</p>
                  <p>This window will close automatically...</p>
                </div>
                <script>
                  setTimeout(() => window.close(), 2000);
                </script>
              </body>
            </html>
          `;
                res.send(html);
                // Fermer la fenêtre popup après un délai
                setTimeout(() => {
                    if (authWindow && !authWindow.isDestroyed()) {
                        authWindow.close();
                        authWindow = null;
                    }
                }, 2500);
            }
            catch (error) {
                console.error('SAML Callback error:', error);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('auth:saml-error', {
                        success: false,
                        error: error.message,
                    });
                }
                res.status(500).send('Authentication failed');
            }
        });
        // Route d'erreur
        app.get('/auth/saml/failure', (req, res) => {
            console.error('SAML Authentication failed');
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('auth:saml-error', {
                    success: false,
                    error: 'SAML authentication failed',
                });
            }
            const html = `
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
              h1 { color: #e74c3c; margin: 0 0 10px 0; }
              p { color: #666; margin: 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authentication Failed</h1>
              <p>Please try again.</p>
              <p>This window will close automatically...</p>
            </div>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `;
            res.status(401).send(html);
            // Fermer la fenêtre popup après un délai
            setTimeout(() => {
                if (authWindow && !authWindow.isDestroyed()) {
                    authWindow.close();
                    authWindow = null;
                }
            }, 3500);
        });
        // Route pour vérifier le statut du serveur
        app.get('/health', (req, res) => {
            res.json({ status: 'ok', port: SAML_PORT });
        });
        // Catch-all pour les routes non définies (utiliser app.use au lieu de app.all)
        app.use((req, res) => {
            console.error(`❌ Route not found: ${req.method} ${req.path}`);
            console.error('Available routes: GET /auth/saml, POST /auth/saml/callback, GET /auth/saml/failure, GET /health');
            res.status(404).send(`Route not found: ${req.method} ${req.path}`);
        });
        // Démarrer le serveur
        return new Promise((resolve, reject) => {
            const server = app.listen(SAML_PORT, () => {
                console.log(`
╔═══════════════════════════════════════╗
║  🚀 SAML Server Started               ║
║  URL: http://localhost:${SAML_PORT}    ║
║  Routes registered:                  ║
║  - GET  /auth/saml                   ║
║  - POST /auth/saml/callback          ║
║  - GET  /auth/saml/failure           ║
║  - GET  /health                      ║
╚═══════════════════════════════════════╝
        `);
                resolve();
            }).on('error', (error) => {
                console.error('Failed to start SAML server:', error);
                reject(error);
            });
        });
    }
    catch (error) {
        console.error('Failed to initialize SAML server:', error);
        throw error;
    }
}
exports.initSAMLServer = initSAMLServer;
/**
 * Retourne l'URL pour initier la connexion SAML
 */
function getSAMLLoginURL() {
    return `http://localhost:${SAML_PORT}/auth/saml`;
}
exports.getSAMLLoginURL = getSAMLLoginURL;
/**
 * Retourne l'utilisateur actuellement authentifié
 */
function getCurrentUser() {
    return currentUser;
}
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=saml-server.js.map