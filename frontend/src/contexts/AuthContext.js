import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the auth context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check if user is already logged in (token in localStorage)
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            try {
                // Set axios default headers for all requests
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                setCurrentUser(JSON.parse(userData));
            } catch (error) {
                console.error('Error parsing user data from localStorage', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }

        setLoading(false);
    }, []);

    // Register a new user
    const register = async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/auth/register', userData);

            // Save token and user data
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Set axios default headers for all requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setCurrentUser(user);
            setLoading(false);
            return user;
        } catch (error) {
            setLoading(false);
            const errorMessage = error.response?.data?.message || 'Registration failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Login user
    const login = async (email, password) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.post('/api/auth/login', { email, password });

            // Save token and user data
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            // Set axios default headers for all requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setCurrentUser(user);
            setLoading(false);
            return user;
        } catch (error) {
            setLoading(false);
            const errorMessage = error.response?.data?.message || 'Login failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Logout user
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setCurrentUser(null);
    };

    // Update user profile
    const updateProfile = async (userData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await axios.put('/api/users/profile', userData);

            // Update user data in localStorage
            const updatedUser = response.data.user;
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setCurrentUser(updatedUser);
            setLoading(false);
            return updatedUser;
        } catch (error) {
            setLoading(false);
            const errorMessage = error.response?.data?.message || 'Profile update failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Check if user is authenticated
    const isAuthenticated = () => {
        return !!currentUser;
    };

    // Check if user is a teacher
    const isTeacher = () => {
        return currentUser?.role === 'teacher';
    };

    // Check if user is a student
    const isStudent = () => {
        return currentUser?.role === 'student';
    };

    // Context value
    const value = {
        currentUser,
        loading,
        error,
        register,
        login,
        logout,
        updateProfile,
        isAuthenticated,
        isTeacher,
        isStudent
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 