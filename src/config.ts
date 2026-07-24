import * as fs from 'fs';
import * as path from 'path';
import * as ini from 'ini';

export interface SAMLConfig {
  certificateFilePath: string;
  entryPoint: string;
  issuer: string;
  callbackUrl: string;
}

export interface OIDCConfig {
  issuer: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scopes: string;
}

export interface AppConfig {
  saml?: SAMLConfig;
  oidc?: OIDCConfig;
}

export function loadConfig(): AppConfig {
  // Chercher config.ini dans le dossier racine
  const configPath = path.join(process.cwd(), 'config.ini');

  if (!fs.existsSync(configPath)) {
    console.warn('config.ini not found. Copy config.ini.example to config.ini');
    return {};
  }

  const configContent = fs.readFileSync(configPath, 'utf-8');
  const parsed = ini.parse(configContent);

  return {
    saml: parsed.SAML ? {
      certificateFilePath: parsed.SAML.certificateFilePath || '',
      entryPoint: parsed.SAML.entryPoint || '',
      issuer: parsed.SAML.issuer || '',
      callbackUrl: parsed.SAML.callbackUrl || '',
    } : undefined,
    oidc: parsed.OIDC ? {
      issuer: parsed.OIDC.issuer || '',
      client_id: parsed.OIDC.client_id || '',
      client_secret: parsed.OIDC.client_secret || '',
      redirect_uri: parsed.OIDC.redirect_uri || '',
      scopes: parsed.OIDC.scopes || 'openid,profile,email',
    } : undefined,
  };
}
