export interface SAMLConfig {
    metadataUrl?: string;
    certificateFilePath?: string;
    entryPoint: string;
    issuer: string;
    callbackUrl: string;
    validateUrl?: string;
}
export interface OIDCConfig {
    issuer: string;
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    post_logout_redirect_uri?: string;
    scopes: string;
    validateUrl?: string;
}
export interface AppConfig {
    saml?: SAMLConfig;
    oidc?: OIDCConfig;
}
export declare function loadConfig(): AppConfig;
//# sourceMappingURL=config.d.ts.map