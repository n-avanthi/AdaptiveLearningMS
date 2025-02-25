import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page components
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LearningPath from './pages/LearningPath';
import LessonView from './pages/LessonView';
import QuizView from './pages/QuizView';
import Profile from './pages/Profile';
import TeacherDashboard from './pages/TeacherDashboard';
import Analytics from './pages/Analytics';
import NotFound from './pages/NotFound';

// Protected route component
const ProtectedRoute = ({ children, requiredRole }) => {
    const { currentUser, isAuthenticated, isTeacher, isStudent } = useContext(AuthContext);

    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    if (requiredRole === 'teacher' && !isTeacher()) {
        return <Navigate to="/dashboard" />;
    }

    if (requiredRole === 'student' && !isStudent()) {
        return <Navigate to="/dashboard" />;
    }

    return children;
};

function App() {
    return (
        <div className="app">
            <Header />
            <main className="container">
                <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected student routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute requiredRole="student">
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/learning-path"
                        element={
                            <ProtectedRoute requiredRole="student">
                                <LearningPath />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/lesson/:lessonId"
                        element={
                            <ProtectedRoute requiredRole="student">
                                <LessonView />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/quiz/:quizId"
                        element={
                            <ProtectedRoute requiredRole="student">
                                <QuizView />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/analytics"
                        element={
                            <ProtectedRoute requiredRole="student">
                                <Analytics />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected teacher routes */}
                    <Route
                        path="/teacher/dashboard"
                        element={
                            <ProtectedRoute requiredRole="teacher">
                                <TeacherDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* 404 route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

export default App; 