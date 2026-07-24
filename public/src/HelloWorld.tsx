import React from 'react';
import './HelloWorld.css';

interface HelloWorldProps {
  user: any;
  onLogout: () => void;
}

const HelloWorld: React.FC<HelloWorldProps> = ({ user, onLogout }) => {
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

        <button className="logout-btn" onClick={onLogout}>
          🚪 Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default HelloWorld;
