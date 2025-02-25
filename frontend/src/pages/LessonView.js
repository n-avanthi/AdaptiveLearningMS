import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LessonView.css';

const LessonView = () => {
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [lesson, setLesson] = useState(null);
    const [progress, setProgress] = useState(0);
    const [nextLesson, setNextLesson] = useState(null);
    const [nextQuiz, setNextQuiz] = useState(null);
    const [showCompletionModal, setShowCompletionModal] = useState(false);

    useEffect(() => {
        // Fetch lesson data
        // This would be replaced with actual API calls
        const fetchLesson = async () => {
            try {
                setLoading(true);

                // In a real app, this would be an API call to the content service
                // const response = await axios.get(`/api/content/lessons/${lessonId}`);
                // const data = response.data;

                // Mock data for demonstration
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Simulate different lessons based on the ID
                let mockLesson;
                let mockNextLesson = null;
                let mockNextQuiz = null;

                switch (lessonId) {
                    case '101':
                        mockLesson = {
                            id: 101,
                            title: 'Introduction to Python',
                            content: `
                <h2>Welcome to Python Programming</h2>
                <p>Python is a high-level, interpreted programming language known for its readability and simplicity. It was created by Guido van Rossum and first released in 1991.</p>
                
                <h3>Why Learn Python?</h3>
                <ul>
                  <li>Easy to learn and use</li>
                  <li>Versatile - used in web development, data science, AI, automation, and more</li>
                  <li>Large community and extensive libraries</li>
                  <li>High demand in the job market</li>
                </ul>
                
                <h3>Getting Started</h3>
                <p>Let's start with a simple "Hello, World!" program:</p>
                
                <pre><code>print("Hello, World!")</code></pre>
                
                <p>When you run this code, it will output:</p>
                
                <pre><code>Hello, World!</code></pre>
                
                <p>Congratulations! You've written your first Python program.</p>
              `,
                            moduleId: 1,
                            moduleTitle: 'Python Fundamentals',
                            duration: '15 minutes',
                            difficulty: 'Beginner'
                        };
                        mockNextLesson = {
                            id: 102,
                            title: 'Variables and Data Types'
                        };
                        break;

                    case '203':
                        mockLesson = {
                            id: 203,
                            title: 'Sets',
                            content: `
                <h2>Python Sets</h2>
                <p>A set is an unordered collection of unique elements in Python. Sets are useful when you need to ensure that all items are unique or when you need to perform mathematical set operations.</p>
                
                <h3>Creating Sets</h3>
                <p>You can create a set using curly braces {} or the set() constructor:</p>
                
                <pre><code># Using curly braces
fruits = {"apple", "banana", "cherry"}

# Using the set() constructor
colors = set(["red", "green", "blue"])</code></pre>
                
                <h3>Set Operations</h3>
                <p>Python sets support various mathematical operations:</p>
                
                <pre><code># Union
set1 = {1, 2, 3}
set2 = {3, 4, 5}
union_set = set1 | set2  # {1, 2, 3, 4, 5}

# Intersection
intersection_set = set1 & set2  # {3}

# Difference
difference_set = set1 - set2  # {1, 2}

# Symmetric Difference
symmetric_difference = set1 ^ set2  # {1, 2, 4, 5}</code></pre>
                
                <h3>Common Set Methods</h3>
                <ul>
                  <li><code>add()</code> - Add an element to a set</li>
                  <li><code>remove()</code> - Remove an element from a set (raises error if not found)</li>
                  <li><code>discard()</code> - Remove an element if present (no error if not found)</li>
                  <li><code>pop()</code> - Remove and return an arbitrary element</li>
                  <li><code>clear()</code> - Remove all elements from the set</li>
                </ul>
              `,
                            moduleId: 2,
                            moduleTitle: 'Data Structures',
                            duration: '20 minutes',
                            difficulty: 'Intermediate'
                        };
                        mockNextLesson = {
                            id: 204,
                            title: 'Tuples'
                        };
                        break;

                    default:
                        mockLesson = {
                            id: parseInt(lessonId),
                            title: `Lesson ${lessonId}`,
                            content: `<h2>Lesson ${lessonId} Content</h2><p>This is a placeholder for lesson ${lessonId} content.</p>`,
                            moduleId: 1,
                            moduleTitle: 'Module Title',
                            duration: '20 minutes',
                            difficulty: 'Intermediate'
                        };
                        mockNextLesson = {
                            id: parseInt(lessonId) + 1,
                            title: `Lesson ${parseInt(lessonId) + 1}`
                        };

                        // Add a quiz after every 5 lessons
                        if (parseInt(lessonId) % 5 === 4) {
                            mockNextQuiz = {
                                id: parseInt(lessonId) + 100,
                                title: `Quiz on Lessons ${parseInt(lessonId) - 3}-${parseInt(lessonId) + 1}`
                            };
                        }
                }

                setLesson(mockLesson);
                setNextLesson(mockNextLesson);
                setNextQuiz(mockNextQuiz);
                setLoading(false);

                // Start tracking progress
                trackProgress();
            } catch (error) {
                console.error('Error fetching lesson:', error);
                setLoading(false);
            }
        };

        fetchLesson();

        // Cleanup function to mark progress when component unmounts
        return () => {
            if (progress < 100) {
                // In a real app, you would send the progress to the server
                console.log(`Saving progress for lesson ${lessonId}: ${progress}%`);
            }
        };
    }, [lessonId]);

    // Function to track user's progress through the lesson
    const trackProgress = () => {
        // In a real app, this would track scroll position, time spent, etc.
        // For this demo, we'll simulate progress over time
        let currentProgress = 0;

        const progressInterval = setInterval(() => {
            currentProgress += 10;
            setProgress(currentProgress);

            if (currentProgress >= 100) {
                clearInterval(progressInterval);
                setShowCompletionModal(true);

                // In a real app, you would send completion status to the server
                console.log(`Lesson ${lessonId} completed!`);
            }
        }, 5000); // Increase progress every 5 seconds

        // Cleanup interval on component unmount
        return () => clearInterval(progressInterval);
    };

    const handleMarkComplete = () => {
        setProgress(100);
        setShowCompletionModal(true);

        // In a real app, you would send completion status to the server
        console.log(`Lesson ${lessonId} marked as complete!`);
    };

    const handleContinue = () => {
        setShowCompletionModal(false);

        // Navigate to the next lesson or quiz
        if (nextQuiz) {
            navigate(`/quiz/${nextQuiz.id}`);
        } else if (nextLesson) {
            navigate(`/lesson/${nextLesson.id}`);
        } else {
            navigate('/learning-path');
        }
    };

    if (loading) {
        return (
            <div className="lesson-container">
                <div className="loading-spinner">Loading lesson content...</div>
            </div>
        );
    }

    return (
        <div className="lesson-container">
            <div className="lesson-header">
                <div className="lesson-navigation">
                    <Link to="/learning-path" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Learning Path
                    </Link>
                    <div className="lesson-progress">
                        <div className="progress-text">{progress}% Complete</div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="lesson-info">
                    <h1>{lesson.title}</h1>
                    <div className="lesson-meta">
                        <span className="module-name">{lesson.moduleTitle}</span>
                        <span className="lesson-duration"><i className="far fa-clock"></i> {lesson.duration}</span>
                        <span className="lesson-difficulty"><i className="fas fa-signal"></i> {lesson.difficulty}</span>
                    </div>
                </div>
            </div>

            <div className="lesson-content">
                <div
                    className="content-area"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                ></div>
            </div>

            <div className="lesson-footer">
                <button
                    className="btn btn-primary"
                    onClick={handleMarkComplete}
                >
                    Mark as Complete
                </button>

                <div className="lesson-navigation-buttons">
                    {nextLesson && (
                        <Link to={`/lesson/${nextLesson.id}`} className="btn btn-outline">
                            Next Lesson: {nextLesson.title} <i className="fas fa-arrow-right"></i>
                        </Link>
                    )}

                    {nextQuiz && (
                        <Link to={`/quiz/${nextQuiz.id}`} className="btn btn-outline quiz-btn">
                            Take Quiz: {nextQuiz.title} <i className="fas fa-question-circle"></i>
                        </Link>
                    )}
                </div>
            </div>

            {/* Lesson completion modal */}
            {showCompletionModal && (
                <div className="modal-overlay">
                    <div className="completion-modal">
                        <div className="completion-icon">🎉</div>
                        <h2>Lesson Completed!</h2>
                        <p>Congratulations on completing <strong>{lesson.title}</strong>!</p>

                        {nextQuiz ? (
                            <p>Ready to test your knowledge with a quiz?</p>
                        ) : nextLesson ? (
                            <p>Ready to move on to the next lesson?</p>
                        ) : (
                            <p>You've completed this module. Return to your learning path to continue.</p>
                        )}

                        <button
                            className="btn btn-primary"
                            onClick={handleContinue}
                        >
                            {nextQuiz ? 'Take Quiz' : nextLesson ? 'Next Lesson' : 'Back to Learning Path'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonView; 