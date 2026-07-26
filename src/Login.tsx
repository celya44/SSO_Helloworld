import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSAMLLogin = async () => {
    setLoading('saml');
    setError(null);
    
    try {
      const result = await (window as any).electron.invoke('auth:saml-login');
      if (!result.success) {
        setError(result.error || 'SAML login failed');
        setLoading(null);
      }
      // Si succès, on attend le callback du serveur SAML via IPC (dans App.tsx)
      // Ne pas fermer le loading ici, il sera fermé par le callback
    } catch (err: any) {
      setError(err.message || 'SAML login error');
      setLoading(null);
    }
  };

  const handleOIDCLogin = async () => {
    setLoading('oidc');
    setError(null);
    
    try {
      const result = await (window as any).electron.invoke('auth:oidc-login');
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'OIDC login failed');
      }
    } catch (err: any) {
      setError(err.message || 'OIDC login error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>SSO Helloworld</h1>
        <p>Veuillez vous identifier</p>

        {error && (
          <div className="error-message">
            <span>❌ {error}</span>
          </div>
        )}

        <div className="login-buttons">
          <button
            className="login-btn saml-btn"
            onClick={handleSAMLLogin}
            disabled={loading !== null}
          >
            {loading === 'saml' ? '⏳ Connexion...' : '🔐 SAML v2'}
          </button>

          <button
            className="login-btn oidc-btn"
            onClick={handleOIDCLogin}
            disabled={loading !== null}
          >
            {loading === 'oidc' ? '⏳ Connexion...' : '🔑 OIDC'}
          </button>
        </div>

        <p className="info-text">
          Utilisez SAML v2 ou OIDC pour vous connecter
        </p>
      </div>
    </div>
  );
};

export default Login;
