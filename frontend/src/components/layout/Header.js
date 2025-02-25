import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './Header.css';

const Header = () => {
    const { currentUser, isAuthenticated, isTeacher, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="container header-container">
                <div className="logo">
                    <Link to="/">
                        <h1>Adaptive Learning System</h1>
                    </Link>
                </div>

                <nav className="main-nav">
                    <ul>
                        <li>
                            <Link to="/">Home</Link>
                        </li>

                        {isAuthenticated() ? (
                            <>
                                <li>
                                    <Link to={isTeacher() ? "/teacher/dashboard" : "/dashboard"}>
                                        Dashboard
                                    </Link>
                                </li>

                                {!isTeacher() && (
                                    <>
                                        <li>
                                            <Link to="/learning-path">Learning Path</Link>
                                        </li>
                                        <li>
                                            <Link to="/analytics">Analytics</Link>
                                        </li>
                                    </>
                                )}

                                <li>
                                    <Link to="/profile">Profile</Link>
                                </li>

                                <li>
                                    <button className="btn-link" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li>
                                    <Link to="/login">Login</Link>
                                </li>
                                <li>
                                    <Link to="/register">Register</Link>
                                </li>
                            </>
                        )}
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header; 