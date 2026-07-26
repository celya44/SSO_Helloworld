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
function loadConfig() {
    // Chercher sso.ini dans ~/.config/celyavox/sso.ini
    const configDir = path.join(os.homedir(), '.config', 'celyavox');
    const configPath = path.join(configDir, 'sso.ini');
    if (!fs.existsSync(configPath)) {
        console.warn(`sso.ini not found at ${configPath}`);
        console.warn(`Please copy sso.ini.example to ${configPath}`);
        console.warn(`Commands: mkdir -p ${configDir} && cp sso.ini.example ${configPath}`);
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