import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ username, isAuthenticated, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close menu when an item is clicked
  const handleMenuItemClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <span className="logo-text">Adaptive LMS</span>
        </Link>

        <div className="hamburger-menu" onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className={`navbar-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="navbar-links">
            <Link to="/" className="navbar-link" onClick={handleMenuItemClick}>Home</Link>
            {isAuthenticated && (
              <Link to="/dashboard" className="navbar-link" onClick={handleMenuItemClick}>Dashboard</Link>
            )}
          </div>

          <div className="navbar-auth">
            {isAuthenticated ? (
              <div className="navbar-user-area">
                {/* <span className="navbar-welcome">Welcome, {username}!</span> */}
                <button onClick={onLogout} className="navbar-button logout">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="navbar-button login" onClick={handleMenuItemClick}>Login</Link>
                <Link to="/register" className="navbar-button register" onClick={handleMenuItemClick}>Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
