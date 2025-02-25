import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
    const { isAuthenticated, isTeacher } = useContext(AuthContext);

    return (
        <div className="home-page">
            <section className="hero">
                <div className="hero-content">
                    <h1>Welcome to the Adaptive Learning System</h1>
                    <p>
                        Personalized learning experiences tailored to your unique needs and learning style.
                        Our AI-powered platform adapts to your progress and helps you achieve your learning goals faster.
                    </p>

                    {!isAuthenticated() ? (
                        <div className="hero-buttons">
                            <Link to="/login" className="btn btn-primary">Login</Link>
                            <Link to="/register" className="btn btn-secondary">Register</Link>
                        </div>
                    ) : (
                        <div className="hero-buttons">
                            <Link
                                to={isTeacher() ? "/teacher/dashboard" : "/dashboard"}
                                className="btn btn-primary"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            <section className="features">
                <h2>Key Features</h2>
                <div className="feature-cards">
                    <div className="feature-card">
                        <div className="feature-icon">📊</div>
                        <h3>Personalized Learning Paths</h3>
                        <p>
                            Our system creates customized learning paths based on your strengths,
                            weaknesses, and learning goals.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🧠</div>
                        <h3>Adaptive Content Delivery</h3>
                        <p>
                            Content difficulty and topics adapt in real-time based on your performance
                            and learning patterns.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">📈</div>
                        <h3>Progress Analytics</h3>
                        <p>
                            Detailed analytics and insights to track your progress and identify areas
                            for improvement.
                        </p>
                    </div>
                </div>
            </section>

            <section className="how-it-works">
                <h2>How It Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h3>Create an Account</h3>
                        <p>Sign up and complete a brief assessment to identify your current knowledge level.</p>
                    </div>

                    <div className="step">
                        <div className="step-number">2</div>
                        <h3>Follow Your Learning Path</h3>
                        <p>Access your personalized learning path with curated lessons and quizzes.</p>
                    </div>

                    <div className="step">
                        <div className="step-number">3</div>
                        <h3>Track Your Progress</h3>
                        <p>Monitor your progress and see how your learning path adapts to your performance.</p>
                    </div>

                    <div className="step">
                        <div className="step-number">4</div>
                        <h3>Achieve Your Goals</h3>
                        <p>Master new skills and knowledge efficiently with our adaptive approach.</p>
                    </div>
                </div>
            </section>

            <section className="cta">
                <h2>Ready to Start Your Learning Journey?</h2>
                <p>Join thousands of learners who have accelerated their learning with our adaptive platform.</p>

                {!isAuthenticated() ? (
                    <Link to="/register" className="btn btn-primary">Get Started Now</Link>
                ) : (
                    <Link
                        to={isTeacher() ? "/teacher/dashboard" : "/dashboard"}
                        className="btn btn-primary"
                    >
                        Continue Learning
                    </Link>
                )}
            </section>
        </div>
    );
};

export default Home; 