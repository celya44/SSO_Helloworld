import { BrowserWindow } from 'electron';
import { SAMLConfig } from './config';
declare global {
    namespace Express {
        interface User {
            name: string;
            email: string;
            method: string;
            claims?: any;
        }
    }
}
/**
 * Enregistrer la fenêtre d'authentification (popup)
 */
export declare function setAuthWindow(window: BrowserWindow | null): void;
/**
 * Configure et lance le serveur SAML
 */
export declare function initSAMLServer(config: SAMLConfig, window: BrowserWindow, appConfig?: any): Promise<void>;
/**
 * Retourne l'URL pour initier la connexion SAML
 */
export declare function getSAMLLoginURL(): string;
/**
 * Retourne l'utilisateur actuellement authentifié
 */
export declare function getCurrentUser(): any;
//# sourceMappingURL=saml-server.d.ts.map