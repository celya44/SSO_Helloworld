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

/**
 * Get config directory based on OS conventions
 * Linux: ~/.config/celyavox
 * macOS: ~/Library/Application Support/celyavox
 * Windows: C:\Program Files\celyavox
 */
function getConfigDirectory(): string {
  const platform = process.platform;
  
  let configDir: string;
  
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
function ensureConfigDirectory(): string {
  const configDir = getConfigDirectory();
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`Created config directory: ${configDir}`);
    } catch (error) {
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
        } catch (fallbackError) {
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
function initializeConfigFile(configDir: string, configPath: string): void {
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
      } catch (error) {
        console.warn(`Failed to copy from ${examplePath}: ${error}`);
      }
    }
  }
  
  if (!exampleFound) {
    console.warn(`sso.ini.example not found in expected locations`);
    console.warn(`Please manually copy sso.ini.example to: ${configPath}`);
  }
}

export function loadConfig(): AppConfig {
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
  } catch (error) {
    console.error(`Error reading config file: ${error}`);
    return {};
  }
}
