import React from 'react';
import './App.css';
import Login from './Login';
import HelloWorld from './HelloWorld';

interface User {
  name?: string;
  email?: string;
  method?: 'saml' | 'oidc';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  // Écouter les événements IPC du serveur SAML
  React.useEffect(() => {
    const electron = (window as any).electron;
    
    if (!electron) {
      console.warn('Electron API not available');
      return;
    }

    // Écouter le succès de l'authentification SAML
    electron.receive('auth:saml-success', (data: any) => {
      console.log('SAML authentication successful:', data);
      if (data.success && data.user) {
        handleLoginSuccess(data.user);
      }
    });

    // Écouter les erreurs d'authentification SAML
    electron.receive('auth:saml-error', (data: any) => {
      console.error('SAML authentication error:', data);
      alert(`Authentication failed: ${data.error}`);
    });

    // Cleanup
    return () => {
      // Les listeners sont généralement maintenus pour Electron
    };
  }, []);

  return (
    <div className="App">
      {isAuthenticated && user ? (
        <HelloWorld user={user} onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;
