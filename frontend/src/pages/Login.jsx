// pages/Login.jsx
import React, { useState, useEffect } from 'react';
import axios from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Add fade-in animation when component mounts
  useEffect(() => {
    document.querySelector('.auth-form-container').classList.add('fade-in');

    // Clear any previous auth attempts when visiting login page
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await axios.post('/login', formData);

      // Validate token exists in response
      if (!res.data.token) {
        throw new Error('No authentication token received');
      }

      // Store authentication data
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', formData.username);

      // Adding a small delay to show loading animation
      setTimeout(() => {
        // Force a full page reload to ensure all components recognize the auth state
        window.location.href = '/dashboard';
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-form-container">
        <div className="auth-form-header">
          <h2>Welcome Back</h2>
          <p>Log in to access your personalized learning experience</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            className={`auth-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="button-loader"></span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register" className="auth-link">Register here</Link>
          </p>
        </div>
      </div>

      <div className="auth-decoration">
        <div className="decoration-circle circle1"></div>
        <div className="decoration-circle circle2"></div>
        <div className="decoration-circle circle3"></div>
      </div>
    </div>
  );
};

export default Login;
