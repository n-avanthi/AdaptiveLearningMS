import React, { useState } from 'react';
import CreateQuiz from './CreateQuiz';
import QuizList from './QuizList';
import TakeQuiz from './TakeQuiz';
import QuizResults from './QuizResults';
import './Quiz.css';

const Quiz = ({ userData }) => {
    const [activeView, setActiveView] = useState('list'); // 'list', 'create', 'take', 'results', 'edit'
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [latestQuizResult, setLatestQuizResult] = useState(null);

    const handleQuizSelect = (quiz) => {
        setSelectedQuiz(quiz);
        setActiveView('take');
    };

    const handleQuizComplete = (result) => {
        // Store the result and show results view
        console.log("Quiz completed with result:", result);
        setLatestQuizResult(result);
        setActiveView('results');
    };

    const handleQuizCreated = (newQuiz) => {
        // After creating a quiz, go back to the list view
        setActiveView('list');
    };

    const handleEditQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setActiveView('edit');
    };

    const handleQuizUpdated = () => {
        // After updating a quiz, go back to the list view
        setActiveView('list');
    };

    const renderView = () => {
        switch (activeView) {
            case 'create':
                return <CreateQuiz onQuizCreated={handleQuizCreated} />;

            case 'edit':
                return (
                    <CreateQuiz
                        initialQuiz={selectedQuiz}
                        onQuizCreated={handleQuizUpdated}
                        isEditing={true}
                    />
                );

            case 'take':
                return (
                    <TakeQuiz
                        quiz={selectedQuiz}
                        username={userData.username}
                        userId={userData.username}
                        onQuizComplete={handleQuizComplete}
                        onBack={() => setActiveView('list')}
                    />
                );

            case 'results':
                return (
                    <QuizResults
                        username={userData.username}
                        latestResult={latestQuizResult}
                    />
                );

            case 'list':
            default:
                return (
                    <QuizList
                        onSelectQuiz={handleQuizSelect}
                        userData={userData}
                        onEditQuiz={handleEditQuiz}
                    />
                );
        }
    };

    return (
        <div className="quiz-container">
            <div className="quiz-header">
                <h2>Quizzes</h2>

                <div className="quiz-nav">
                    <button
                        className={`nav-btn ${activeView === 'list' ? 'active' : ''}`}
                        onClick={() => setActiveView('list')}
                    >
                        Browse Quizzes
                    </button>

                    {/* Only teachers and admins can create quizzes */}
                    {(userData.role === 'teacher' || userData.role === 'admin') && (
                        <button
                            className={`nav-btn ${activeView === 'create' ? 'active' : ''}`}
                            onClick={() => setActiveView('create')}
                        >
                            Create Quiz
                        </button>
                    )}

                    <button
                        className={`nav-btn ${activeView === 'results' ? 'active' : ''}`}
                        onClick={() => setActiveView('results')}
                    >
                        My Results
                    </button>
                </div>
            </div>

            <div className="quiz-content">
                {renderView()}
            </div>
        </div>
    );
};

export default Quiz; 