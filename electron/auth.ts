import { ipcMain, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { loadConfig, AppConfig } from './config';
import { initSAMLServer, getSAMLLoginURL, setAuthWindow } from './saml-server';

let appConfig: AppConfig | null = null;
let mainWindow: BrowserWindow | null = null;
let authWindow: BrowserWindow | null = null;

// Charger la config au démarrage
export function initAuth(window: BrowserWindow) {
  mainWindow = window;
  
  try {
    appConfig = loadConfig();
    console.log('Config loaded successfully');
    
    // Initialiser le serveur SAML si configuré
    if (appConfig?.saml) {
      initSAMLServer(appConfig.saml, window, appConfig).catch((error) => {
        console.error('Failed to initialize SAML server:', error);
      });
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

/**
 * Crée une fenêtre popup pour l'authentification SAML
 */
function createAuthWindow(url: string): BrowserWindow {
  const authWin = new BrowserWindow({
    width: 600,
    height: 700,
    parent: mainWindow || undefined,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  authWin.loadURL(url);
  authWin.show();

  // Ouvrir les dev tools en développement
  const isDev = require('electron-is-dev');
  if (isDev) {
    authWin.webContents.openDevTools();
  }

  // Enregistrer la fenêtre d'auth dans le serveur SAML
  setAuthWindow(authWin);

  // Nettoyer quand la fenêtre se ferme
  authWin.once('closed', () => {
    setAuthWindow(null);
  });

  return authWin;
}

// IPC Handler pour SAML login
ipcMain.handle('auth:saml-login', async (event) => {
  try {
    if (!appConfig?.saml) {
      return {
        success: false,
        error: 'SAML not configured in sso.ini',
      };
    }

    console.log('SAML Login initiated');
    console.log('SAML Config:', {
      metadataUrl: appConfig.saml.metadataUrl,
      issuer: appConfig.saml.issuer,
      entryPoint: appConfig.saml.entryPoint,
      callbackUrl: appConfig.saml.callbackUrl,
    });

    // Créer la fenêtre popup pour l'authentification
    const samlLoginURL = getSAMLLoginURL();
    console.log('Opening SAML login in popup:', samlLoginURL);
    
    // Fermer la fenêtre précédente si elle existe
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.close();
    }
    
    authWindow = createAuthWindow(samlLoginURL);

    // Attendre que la fenêtre se ferme (après authentification réussie ou erreur)
    return new Promise((resolve) => {
      authWindow?.once('closed', () => {
        console.log('Auth window closed');
        authWindow = null;
        // La vraie réponse est envoyée via IPC depuis le serveur SAML
        resolve({
          success: true,
          message: 'Authentication in progress...',
        });
      });
    });
  } catch (error: any) {
    console.error('SAML Login error:', error);
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.close();
    }
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
