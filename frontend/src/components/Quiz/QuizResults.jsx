import React, { useState, useEffect } from 'react';
import quizApi from '../../services/quizApi';
import ReactMarkdown from 'react-markdown';
import './Quiz.css';

const QuizResults = ({ username, latestResult }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedResult, setSelectedResult] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    useEffect(() => {
        fetchUserResults();

        // If we have a latestResult, select it immediately
        if (latestResult) {
            console.log("Setting latest result as selected:", latestResult);
            setSelectedResult(latestResult);

            // If this result has a feedback task ID, check status
            if (latestResult.feedbackTaskId) {
                checkFeedbackStatus(latestResult.feedbackTaskId);
            } else {
                // If feedback is already available in the result
                setFeedback(latestResult.aiFeedback || null);
            }
        }

        // Set up an interval to refresh results if we're waiting for feedback
        const shouldPoll = latestResult && latestResult.feedbackTaskId && !latestResult.aiFeedback;

        let intervalId;
        if (shouldPoll) {
            console.log("Setting up polling interval for results");
            intervalId = setInterval(fetchUserResults, 10000); // Refresh every 10 seconds
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [username, latestResult]);

    const fetchUserResults = async () => {
        try {
            setLoading(true);
            console.log("Fetching results for user:", username);

            // Try to clear the cache first, but continue even if it fails
            try {
                console.log("Clearing quiz cache before fetching results");
                await quizApi.clearQuizCache();
                console.log("Cache cleared successfully");
            } catch (cacheError) {
                console.warn("Error clearing cache:", cacheError);
                // Continue anyway, cache clearing is helpful but not critical
            }

            // Add a delay to ensure backend has time to return fresh results
            await new Promise(resolve => setTimeout(resolve, 500));

            // Add a timestamp to bust client-side cache
            const timestamp = new Date().getTime();
            const response = await quizApi.getUserResults(`${username}?t=${timestamp}`);
            console.log("API response for user results:", response);

            if (response.data && response.data.length > 0) {
                setResults(response.data);

                // If we have a latestResult, find its updated version in the results
                if (latestResult && latestResult._id) {
                    const updatedResult = response.data.find(r => r._id === latestResult._id);
                    if (updatedResult) {
                        console.log("Found updated version of latest result:", updatedResult);
                        setSelectedResult(updatedResult);

                        // If it now has feedback, update that too
                        if (updatedResult.aiFeedback) {
                            setFeedback(updatedResult.aiFeedback);
                        }
                    }
                }
                setError('');
            } else {
                console.log("No results found for user:", username);
                setResults([]);
            }
        } catch (err) {
            console.error("Error fetching quiz results:", err);
            setError('Failed to fetch quiz results. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const viewResult = (result) => {
        setSelectedResult(result);

        // If this result has a feedback task ID and no aiFeedback yet, check status
        if (result.feedbackTaskId && !result.aiFeedback) {
            checkFeedbackStatus(result.feedbackTaskId);
        } else {
            // If feedback is already available in the result
            setFeedback(result.aiFeedback || null);
        }
    };

    const checkFeedbackStatus = async (taskId) => {
        try {
            setFeedbackLoading(true);
            console.log("Checking feedback status for task:", taskId);
            const response = await quizApi.getFeedbackStatus(taskId);
            console.log("Feedback status response:", response.data);

            if (response.data.status === 'completed') {
                console.log("Feedback completed:", response.data.feedback);
                setFeedback(response.data.feedback);

                // Update the selected result with the feedback
                setSelectedResult(prev => ({
                    ...prev,
                    aiFeedback: response.data.feedback
                }));

                // Also update the results array to persist the feedback
                setResults(prevResults => {
                    // Add null/undefined check for selectedResult
                    if (!selectedResult || !selectedResult._id) {
                        console.log("Selected result is null or missing _id, cannot update results array");
                        return prevResults;
                    }

                    return prevResults.map(result =>
                        result && result._id === selectedResult._id
                            ? { ...result, aiFeedback: response.data.feedback }
                            : result
                    );
                });

                setFeedbackLoading(false);
            } else if (response.data.status === 'processing') {
                // Feedback still processing, poll again in 3 seconds
                console.log("Feedback still processing, will check again in 3 seconds");
                setTimeout(() => checkFeedbackStatus(taskId), 3000);
            } else {
                // Something went wrong, set a generic message
                console.log("Feedback status error:", response.data);
                setFeedback("Could not retrieve AI feedback. Please refresh and try again.");
                setFeedbackLoading(false);
            }
        } catch (err) {
            console.error('Error checking feedback status:', err);
            setFeedback("Error fetching AI feedback. Please try again later.");
            setFeedbackLoading(false);
        }
    };

    const goBack = () => {
        setSelectedResult(null);
        setFeedback(null);
    };

    return (
        <div className="quiz-results-container">
            <h3>Your Quiz Results</h3>

            <div className="refresh-controls">
                <button
                    className="refresh-btn"
                    onClick={fetchUserResults}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh Results'}
                </button>
            </div>

            {selectedResult ? (
                // If we have a selected result (from latestResult prop), show it even if API returned empty
                <div className="quiz-result-detail">
                    <button className="back-btn" onClick={goBack}>
                        &larr; Back to Results List
                    </button>

                    <h3>Quiz Results</h3>

                    <div className="result-summary">
                        <p><strong>Score:</strong> {selectedResult.score.toFixed(1)}%</p>
                        <p><strong>Correct Answers:</strong> {selectedResult.correctCount} out of {selectedResult.totalQuestions}</p>
                        <p><strong>Completed On:</strong> {new Date(selectedResult.completedAt).toLocaleDateString()}</p>
                    </div>

                    {selectedResult.wrongQuestions && selectedResult.wrongQuestions.length > 0 && (
                        <div className="wrong-answers-section">
                            <h4>Questions You Missed</h4>

                            {selectedResult.wrongQuestions.map((wrongQ, index) => (
                                <div key={index} className="wrong-question">
                                    <p><strong>Question:</strong> {wrongQ.question}</p>
                                    <p><strong>Your Answer:</strong> {wrongQ.choices[wrongQ.userAnswer]}</p>
                                    <p><strong>Correct Answer:</strong> {wrongQ.choices[wrongQ.correctAnswer]}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="ai-feedback-section">
                        <h4>AI Feedback and Practice Questions</h4>

                        {feedbackLoading ? (
                            <div className="loading-feedback">
                                <p>Generating AI feedback... This may take a moment.</p>
                                <div className="loading-spinner"></div>
                            </div>
                        ) : feedback ? (
                            <div className="feedback-content markdown-content">
                                <ReactMarkdown>{feedback.replace(/\n/g, '\n')}</ReactMarkdown>
                            </div>
                        ) : selectedResult.feedbackTaskId ? (
                            <div className="pending-feedback">
                                <p>AI feedback is being generated. Check back in a few moments or click the button below to check now.</p>
                                <button
                                    className="check-feedback-btn"
                                    onClick={() => checkFeedbackStatus(selectedResult.feedbackTaskId)}
                                >
                                    Check Feedback Status
                                </button>
                            </div>
                        ) : (
                            <div className="no-feedback">
                                <p>No AI feedback available for this quiz. This could be because you answered all questions correctly or the feedback system was unavailable when you took the quiz.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : loading ? (
                <div className="loading">Loading results...</div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : results.length === 0 ? (
                <div className="no-data">You haven't completed any quizzes yet.</div>
            ) : (
                <div className="results-list">
                    {results.map((result) => (
                        <div key={result._id} className="result-item" onClick={() => viewResult(result)}>
                            <div className="result-summary">
                                <p><strong>Quiz ID:</strong> {result.quizId}</p>
                                <p><strong>Score:</strong> {result.score.toFixed(1)}%</p>
                                <p><strong>Date:</strong> {new Date(result.completedAt).toLocaleDateString()}</p>
                            </div>

                            <div className="result-status">
                                {result.score >= 80 ? (
                                    <span className="status-high">High Score</span>
                                ) : result.score >= 60 ? (
                                    <span className="status-medium">Medium Score</span>
                                ) : (
                                    <span className="status-low">Needs Improvement</span>
                                )}

                                {result.aiFeedback && (
                                    <span className="feedback-badge">AI Feedback Available</span>
                                )}
                            </div>

                            <button className="view-btn">View Details</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizResults; 