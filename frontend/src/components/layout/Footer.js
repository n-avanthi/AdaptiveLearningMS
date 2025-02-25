import React from 'react';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container footer-container">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3>Adaptive Learning System</h3>
                        <p>Personalized learning experiences tailored to your needs.</p>
                    </div>

                    <div className="footer-section">
                        <h3>Quick Links</h3>
                        <ul>
                            <li><a href="/">Home</a></li>
                            <li><a href="/login">Login</a></li>
                            <li><a href="/register">Register</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h3>Contact</h3>
                        <p>Email: support@adaptivelearning.com</p>
                        <p>Phone: (123) 456-7890</p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {currentYear} Adaptive Learning System. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer; 