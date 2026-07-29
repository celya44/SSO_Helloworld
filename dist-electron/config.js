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
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const ini = __importStar(require("ini"));
/**
 * Get config directory based on OS conventions
 * Linux: ~/.config/celyavox
 * macOS: ~/Library/Application Support/celyavox
 * Windows: C:\Program Files\celyavox
 */
function getConfigDirectory() {
    const platform = process.platform;
    let configDir;
    switch (platform) {
        case 'darwin':
            // macOS
            configDir = path.join(os.homedir(), 'Library', 'Application Support', 'celyavox');
            break;
        case 'win32':
            // Windows - Use Program Files
            const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
            configDir = path.join(programFiles, 'celyavox');
            break;
        default:
            // Linux and other Unix-like systems
            configDir = path.join(os.homedir(), '.config', 'celyavox');
    }
    return configDir;
}
/**
 * Ensure config directory exists and copy example file if needed
 */
function ensureConfigDirectory() {
    const configDir = getConfigDirectory();
    // Create directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
        try {
            fs.mkdirSync(configDir, { recursive: true });
            console.log(`Created config directory: ${configDir}`);
        }
        catch (error) {
            console.error(`Failed to create config directory: ${configDir}`);
            console.error(`Error: ${error}`);
            // On Windows, if Program Files is not writable, fallback to APPDATA
            if (process.platform === 'win32') {
                const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
                const fallbackDir = path.join(appData, 'celyavox');
                console.warn(`Falling back to: ${fallbackDir}`);
                try {
                    fs.mkdirSync(fallbackDir, { recursive: true });
                    return fallbackDir;
                }
                catch (fallbackError) {
                    console.error(`Fallback directory also failed: ${fallbackError}`);
                    throw new Error(`Unable to create config directory at ${configDir} or ${fallbackDir}`);
                }
            }
            throw error;
        }
    }
    return configDir;
}
/**
 * Copy sso.ini.example to ~/.config/celyavox/sso.ini if it doesn't exist
 */
function initializeConfigFile(configDir, configPath) {
    if (fs.existsSync(configPath)) {
        return; // Config already exists
    }
    // Try to find sso.ini.example in multiple locations
    const possiblePaths = [
        path.join(__dirname, '../../sso.ini.example'),
        path.join(__dirname, '../sso.ini.example'),
        path.join(__dirname, '../../../sso.ini.example'),
        path.join(process.resourcesPath, 'sso.ini.example'),
    ];
    let exampleFound = false;
    for (const examplePath of possiblePaths) {
        if (fs.existsSync(examplePath)) {
            try {
                fs.copyFileSync(examplePath, configPath);
                console.log(`Initialized config file from: ${examplePath}`);
                console.log(`Config copied to: ${configPath}`);
                exampleFound = true;
                break;
            }
            catch (error) {
                console.warn(`Failed to copy from ${examplePath}: ${error}`);
            }
        }
    }
    if (!exampleFound) {
        console.warn(`sso.ini.example not found in expected locations`);
        console.warn(`Please manually copy sso.ini.example to: ${configPath}`);
    }
}
function loadConfig() {
    // Chercher sso.ini dans ~/.config/celyavox/sso.ini
    const configDir = ensureConfigDirectory();
    const configPath = path.join(configDir, 'sso.ini');
    // Initialize config file if needed
    initializeConfigFile(configDir, configPath);
    if (!fs.existsSync(configPath)) {
        console.warn(`sso.ini not found at ${configPath}`);
        console.warn(`Please copy sso.ini.example to ${configPath}`);
        return {};
    }
    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const parsed = ini.parse(configContent);
        console.log(`Configuration loaded from ${configPath}`);
        return {
            saml: parsed.SAML ? {
                metadataUrl: parsed.SAML.metadataUrl,
                certificateFilePath: parsed.SAML.certificateFilePath || '',
                entryPoint: parsed.SAML.entryPoint || '',
                issuer: parsed.SAML.issuer || '',
                callbackUrl: parsed.SAML.callbackUrl || '',
                validateUrl: parsed.SAML.validateUrl || '', // URL pour valider SAML
            } : undefined,
            oidc: parsed.OIDC ? {
                issuer: parsed.OIDC.issuer || '',
                client_id: parsed.OIDC.client_id || '',
                client_secret: parsed.OIDC.client_secret || '',
                redirect_uri: parsed.OIDC.redirect_uri || '',
                post_logout_redirect_uri: parsed.OIDC.post_logout_redirect_uri || '',
                scopes: parsed.OIDC.scopes || 'openid,profile,email',
                validateUrl: parsed.OIDC.validateUrl || '', // URL pour valider OIDC
            } : undefined,
        };
    }
    catch (error) {
        console.error(`Error reading config file: ${error}`);
        return {};
    }
}
exports.loadConfig = loadConfig;
//# sourceMappingURL=config.js.map