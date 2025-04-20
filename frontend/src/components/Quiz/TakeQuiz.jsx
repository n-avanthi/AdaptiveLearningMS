import React, { useState, useEffect } from 'react';
import quizApi from '../../services/quizApi';
import './Quiz.css';

const TakeQuiz = ({ quiz, username, userId, onQuizComplete, onBack }) => {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [quizResult, setQuizResult] = useState(null);

    useEffect(() => {
        // Initialize answers array with nulls (no answer selected)
        setAnswers(new Array(quiz.questions.length).fill(null));
    }, [quiz]);

    const handleAnswerSelect = (questionIndex, choiceIndex) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = choiceIndex;
        setAnswers(newAnswers);
    };

    const goToNextQuestion = () => {
        if (currentQuestion < quiz.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const goToPrevQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const submitQuiz = async () => {
        // Check if all questions have been answered
        if (answers.includes(null)) {
            setError('Please answer all questions before submitting.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await quizApi.submitQuiz({
                quizId: quiz._id,
                userId: userId,
                username: username,
                answers: answers
            });

            setQuizResult(response.data);

            if (onQuizComplete && typeof onQuizComplete === 'function') {
                onQuizComplete(response.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit quiz. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // If quiz is complete and result is available
    if (quizResult) {
        return (
            <div className="quiz-result-container">
                <h3>Quiz Completed!</h3>

                <div className="result-summary">
                    <p><strong>Score:</strong> {quizResult.score.toFixed(1)}%</p>
                    <p><strong>Correct Answers:</strong> {quizResult.correctCount} out of {quizResult.totalQuestions}</p>
                </div>

                {quizResult.feedbackTaskId && (
                    <div className="feedback-section">
                        <p>AI feedback is being generated for this quiz. Check your results page later to see personalized feedback!</p>
                    </div>
                )}

                <div className="action-buttons">
                    <button className="back-btn" onClick={onBack}>
                        Return to Quizzes
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestionData = quiz.questions[currentQuestion];

    return (
        <div className="take-quiz-container">
            <h3>{quiz.title}</h3>
            <div className="quiz-progress">
                <p>Question {currentQuestion + 1} of {quiz.questions.length}</p>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
                    ></div>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="question-box">
                <h4>{currentQuestionData.question}</h4>

                <div className="choices-list">
                    {currentQuestionData.choices.map((choice, choiceIndex) => (
                        <div
                            key={choiceIndex}
                            className={`choice-item ${answers[currentQuestion] === choiceIndex ? 'selected' : ''}`}
                            onClick={() => handleAnswerSelect(currentQuestion, choiceIndex)}
                        >
                            <span className="choice-letter">{String.fromCharCode(65 + choiceIndex)}</span>
                            <span className="choice-text">{choice}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="navigation-buttons">
                <button
                    className="prev-btn"
                    onClick={goToPrevQuestion}
                    disabled={currentQuestion === 0}
                >
                    Previous
                </button>

                {currentQuestion < quiz.questions.length - 1 ? (
                    <button
                        className="next-btn"
                        onClick={goToNextQuestion}
                    >
                        Next
                    </button>
                ) : (
                    <button
                        className="submit-btn"
                        onClick={submitQuiz}
                        disabled={loading}
                    >
                        {loading ? 'Submitting...' : 'Submit Quiz'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default TakeQuiz; 