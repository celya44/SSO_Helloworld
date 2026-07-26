import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as ini from 'ini';

export interface SAMLConfig {
  metadataUrl?: string;
  certificateFilePath?: string;
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
  validateUrl?: string; // URL pour valider l'assertion SAML côté backend
}

export interface OIDCConfig {
  issuer: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  post_logout_redirect_uri?: string; // URL après logout
  scopes: string;
  validateUrl?: string; // URL pour valider le token OIDC côté backend
}

export interface AppConfig {
  saml?: SAMLConfig;
  oidc?: OIDCConfig;
}

export function loadConfig(): AppConfig {
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
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    return {};
  }
}
