import { ipcMain } from 'electron';
import { loadConfig, AppConfig } from './config';

let appConfig: AppConfig | null = null;

// Charger la config au démarrage
export function initAuth() {
  try {
    appConfig = loadConfig();
    console.log('Config loaded successfully');
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// IPC Handler pour SAML login
ipcMain.handle('auth:saml-login', async (event) => {
  try {
    if (!appConfig?.saml) {
      return {
        success: false,
        error: 'SAML not configured in config.ini',
      };
    }

    console.log('SAML Login initiated');
    console.log('SAML Config:', {
      issuer: appConfig.saml.issuer,
      entryPoint: appConfig.saml.entryPoint,
      callbackUrl: appConfig.saml.callbackUrl,
    });

    // Simulation d'une authentification réussie
    // En production, vous utiliserez passport-saml ou passport-openidconnect
    const user = {
      name: 'SAML User',
      email: 'saml.user@example.com',
      method: 'saml',
    };

    console.log('SAML Login successful');
    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('SAML Login error:', error);
    return {
      success: false,
      error: error.message || 'SAML authentication failed',
    };
  }
});

// IPC Handler pour OIDC login
ipcMain.handle('auth:oidc-login', async (event) => {
  try {
    if (!appConfig?.oidc) {
      return {
        success: false,
        error: 'OIDC not configured in config.ini',
      };
    }

    console.log('OIDC Login initiated');
    console.log('OIDC Config:', {
      issuer: appConfig.oidc.issuer,
      client_id: appConfig.oidc.client_id,
      redirect_uri: appConfig.oidc.redirect_uri,
    });

    // Simulation d'une authentification réussie
    // En production, vous utiliserez openid-client ou passport-openidconnect
    const user = {
      name: 'OIDC User',
      email: 'oidc.user@example.com',
      method: 'oidc',
    };

    console.log('OIDC Login successful');
    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('OIDC Login error:', error);
    return {
      success: false,
      error: error.message || 'OIDC authentication failed',
    };
  }
});
