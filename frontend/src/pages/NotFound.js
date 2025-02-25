import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
    return (
        <div className="not-found-container">
            <div className="not-found-content">
                <div className="error-code">404</div>
                <h1>Page Not Found</h1>
                <p>
                    The page you are looking for might have been removed, had its name changed,
                    or is temporarily unavailable.
                </p>
                <div className="not-found-actions">
                    <Link to="/" className="btn btn-primary">
                        Return to Home
                    </Link>
                    <Link to="/dashboard" className="btn btn-outline">
                        Go to Dashboard
                    </Link>
                </div>
                <div className="not-found-suggestions">
                    <h2>You might be looking for:</h2>
                    <ul>
                        <li>
                            <Link to="/learning-path">Your Learning Path</Link>
                        </li>
                        <li>
                            <Link to="/profile">Your Profile</Link>
                        </li>
                        <li>
                            <Link to="/analytics">Learning Analytics</Link>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default NotFound; 