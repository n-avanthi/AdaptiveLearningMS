import React, { useState, useEffect } from 'react';
import quizApi from '../../services/quizApi';
import './Quiz.css';

const QuizList = ({ onSelectQuiz, userData, onEditQuiz }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        subject: '',
        level: ''
    });
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async (subject = null, level = null) => {
        try {
            setLoading(true);
            const response = await quizApi.getQuizzes(subject, level);
            setQuizzes(response.data);
            setError('');
        } catch (err) {
            setError('Failed to fetch quizzes. Please try again later.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters({ ...filters, [name]: value });
    };

    const applyFilters = () => {
        fetchQuizzes(
            filters.subject || null,
            filters.level || null
        );
    };

    const resetFilters = () => {
        setFilters({ subject: '', level: '' });
        fetchQuizzes();
    };

    const handleQuizSelect = (quiz) => {
        if (onSelectQuiz && typeof onSelectQuiz === 'function') {
            onSelectQuiz(quiz);
        }
    };

    const handleEditQuiz = (e, quiz) => {
        e.stopPropagation(); // Prevent triggering card click (quiz selection)
        if (onEditQuiz && typeof onEditQuiz === 'function') {
            onEditQuiz(quiz);
        }
    };

    const handleDeleteConfirm = (e, quizId) => {
        e.stopPropagation(); // Prevent triggering card click (quiz selection)
        setDeleteConfirm(quizId);
    };

    const handleDeleteCancel = (e) => {
        e.stopPropagation(); // Prevent triggering card click (quiz selection)
        setDeleteConfirm(null);
    };

    const handleDeleteQuiz = async (e, quizId) => {
        e.stopPropagation(); // Prevent triggering card click (quiz selection)
        try {
            await quizApi.deleteQuiz(quizId);
            // Remove the deleted quiz from the state
            setQuizzes(quizzes.filter(quiz => quiz._id !== quizId));
            setDeleteConfirm(null);
        } catch (err) {
            console.error('Failed to delete quiz:', err);
            alert('Failed to delete quiz. Please try again later.');
        }
    };

    // Check if user is teacher or admin
    const isTeacherOrAdmin = userData && ['teacher', 'admin'].includes(userData.role);

    return (
        <div className="quiz-list-container">
            <h3>Available Quizzes</h3>

            <div className="filter-section">
                <div className="filter-controls">
                    <div className="filter-group">
                        <label htmlFor="subject">Subject:</label>
                        <input
                            type="text"
                            id="subject"
                            name="subject"
                            value={filters.subject}
                            onChange={handleFilterChange}
                        />
                    </div>

                    <div className="filter-group">
                        <label htmlFor="level">Level:</label>
                        <select
                            id="level"
                            name="level"
                            value={filters.level}
                            onChange={handleFilterChange}
                        >
                            <option value="">All Levels</option>
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>

                    <button className="filter-btn" onClick={applyFilters}>Apply Filters</button>
                    <button className="reset-btn" onClick={resetFilters}>Reset</button>
                </div>
            </div>

            {loading ? (
                <div className="loading">Loading quizzes...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : quizzes.length === 0 ? (
                <div className="no-data">No quizzes available.</div>
            ) : (
                <div className="quiz-grid">
                    {quizzes.map((quiz) => (
                        <div key={quiz._id} className="quiz-card" onClick={() => handleQuizSelect(quiz)}>
                            <h4>{quiz.title}</h4>
                            <div className="quiz-info">
                                <p><strong>Subject:</strong> {quiz.subject}</p>
                                <p><strong>Level:</strong> {quiz.level}</p>
                                <p><strong>Questions:</strong> {quiz.questions.length}</p>
                            </div>
                            <div className="quiz-actions">
                                <button className="take-quiz-btn">Take Quiz</button>

                                {/* Edit/Delete buttons only for teachers and admins */}
                                {isTeacherOrAdmin && (
                                    <div className="admin-actions">
                                        <button
                                            className="edit-quiz-btn"
                                            onClick={(e) => handleEditQuiz(e, quiz)}
                                        >
                                            Edit
                                        </button>

                                        {deleteConfirm === quiz._id ? (
                                            <div className="delete-confirm">
                                                <p>Are you sure?</p>
                                                <button
                                                    className="confirm-yes"
                                                    onClick={(e) => handleDeleteQuiz(e, quiz._id)}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    className="confirm-no"
                                                    onClick={handleDeleteCancel}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                className="delete-quiz-btn"
                                                onClick={(e) => handleDeleteConfirm(e, quiz._id)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizList; 