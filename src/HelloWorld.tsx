import React, { useState } from 'react';
import './HelloWorld.css';

interface HelloWorldProps {
  user: any;
  onLogout: () => void;
}

const HelloWorld: React.FC<HelloWorldProps> = ({ user, onLogout }) => {
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [logsLoading, setLogsLoading] = useState(false);

  const handleViewLogs = async () => {
    setLogsLoading(true);
    try {
      const logsContent = await (window as any).electron.getLogs();
      setLogs(logsContent);
      setShowLogs(true);
    } catch (err: any) {
      alert('Failed to load logs: ' + err.message);
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
      alert('Failed to download logs: ' + err.message);
    }
  };

  const handleClearLogs = async () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      try {
        const result = await (window as any).electron.clearLogs();
        if (result.success) {
          setLogs('');
          setShowLogs(false);
          alert('Logs cleared successfully');
        } else {
          alert('Failed to clear logs: ' + result.error);
        }
      } catch (err: any) {
        alert('Failed to clear logs: ' + err.message);
      }
    }
  };

  return (
    <div className="helloworld-container">
      <div className="helloworld-card">
        <div className="success-icon">✅</div>
        <h1>Hello World!</h1>
        <p>Vous êtes connecté avec succès</p>

        <div className="user-info">
          <div className="info-item">
            <span className="label">Identité:</span>
            <span className="value">{user.name || user.email || 'Utilisateur'}</span>
          </div>
          {user.email && (
            <div className="info-item">
              <span className="label">Email:</span>
              <span className="value">{user.email}</span>
            </div>
          )}
          {user.method && (
            <div className="info-item">
              <span className="label">Méthode:</span>
              <span className="value">{user.method === 'saml' ? 'SAML v2' : 'OIDC'}</span>
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button className="logout-btn" onClick={onLogout}>
            🚪 Se déconnecter
          </button>
        </div>

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

export default HelloWorld;
