import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Auth/Navbar';
import LandingPage from './pages/LandingPage';

const App = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  // Check authentication status whenever the component mounts or route changes
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const storedUsername = localStorage.getItem('username');

      // Clear auth if we're on the landing page and forcing a re-auth
      if (location.pathname === '/' && new URLSearchParams(location.search).get('reauth') === 'true') {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setIsAuthenticated(false);
        setUsername('');
        return;
      }

      // Otherwise check for valid token
      if (token && storedUsername) {
        setIsAuthenticated(true);
        setUsername(storedUsername);
      } else {
        setIsAuthenticated(false);
        setUsername('');
      }
    };

    checkAuth();
  }, [location]);

  // Function to handle logout that can be passed to Navbar
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername('');
    // Force a navigation to landing page with reauth flag
    window.location.href = '/?reauth=true';
  };

  return (
    <div className="app-container">
      <Navbar
        username={username}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
          <Route
            path="/dashboard"
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
