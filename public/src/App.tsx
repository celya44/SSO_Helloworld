import React, { useState } from 'react';
import Login from './Login';
import HelloWorld from './HelloWorld';
import './App.css';

interface User {
  name?: string;
  email?: string;
  method?: 'saml' | 'oidc';
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

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

