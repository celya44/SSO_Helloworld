import React, { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLoginSuccess: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

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

  const handleViewLogs = async () => {
    setLogsLoading(true);
    try {
      const logsContent = await (window as any).electron.getLogs();
      setLogs(logsContent);
      setShowLogs(true);
    } catch (err: any) {
      setError('Failed to load logs: ' + err.message);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const logsContent = await (window as any).electron.getLogs();
      
      // Create a blob and download it
      const element = document.createElement('a');
      const file = new Blob([logsContent], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `app-logs-${new Date().toISOString().split('T')[0]}.log`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err: any) {
      setError('Failed to download logs: ' + err.message);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      try {
        const result = await (window as any).electron.clearLogs();
        if (result.success) {
          setLogs('');
          setShowLogs(false);
          setError('Logs cleared successfully');
          setTimeout(() => setError(null), 3000);
        } else {
          setError('Failed to clear logs: ' + result.error);
        }
      } catch (err: any) {
        setError('Failed to clear logs: ' + err.message);
      }
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

        {/* Log actions */}
        <div className="log-actions">
          <button
            className="log-btn view-btn"
            onClick={handleViewLogs}
            disabled={logsLoading}
            title="View application logs"
          >
            {logsLoading ? '⏳ Loading...' : '📋 View Logs'}
          </button>
          <button
            className="log-btn download-btn"
            onClick={handleDownloadLogs}
            title="Download logs as file"
          >
            ⬇️ Download Logs
          </button>
        </div>
      </div>

      {/* Logs Modal */}
      {showLogs && (
        <div className="logs-modal" onClick={() => setShowLogs(false)}>
          <div className="logs-content" onClick={(e) => e.stopPropagation()}>
            <div className="logs-header">
              <h2>Application Logs</h2>
              <button 
                className="close-btn"
                onClick={() => setShowLogs(false)}
                title="Close logs"
              >
                ✕
              </button>
            </div>
            
            <div className="logs-body">
              <pre>{logs || 'No logs available'}</pre>
            </div>
            
            <div className="logs-footer">
              <button
                className="log-btn clear-btn"
                onClick={handleClearLogs}
              >
                🗑️ Clear Logs
              </button>
              <button
                className="log-btn"
                onClick={handleDownloadLogs}
              >
                ⬇️ Download
              </button>
              <button
                className="log-btn close-modal-btn"
                onClick={() => setShowLogs(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
