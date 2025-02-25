import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './QuizView.css';

const QuizView = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    // Fetch quiz data
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        
        // Mock data for demonstration
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate different quizzes based on the ID
        let mockQuiz;
        
        switch (quizId) {
          case '201':
            mockQuiz = {
              id: 201,
              title: 'Python Basics Quiz',
              description: 'Test your knowledge of Python fundamentals',
              moduleId: 1,
              moduleTitle: 'Python Fundamentals',
              timeLimit: 10, // minutes
              passingScore: 70,
              questions: [
                {
                  id: 1,
                  text: 'What is Python?',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: 'A snake species' },
                    { id: 'b', text: 'A high-level programming language' },
                    { id: 'c', text: 'A database management system' },
                    { id: 'd', text: 'A web browser' }
                  ],
                  correctAnswer: 'b',
                  points: 10
                },
                {
                  id: 2,
                  text: 'Which of the following is a valid Python variable name?',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: '2variable' },
                    { id: 'b', text: 'my-variable' },
                    { id: 'c', text: 'my_variable' },
                    { id: 'd', text: 'class' }
                  ],
                  correctAnswer: 'c',
                  points: 10
                },
                {
                  id: 3,
                  text: 'What will be the output of the following code?\n\nx = 5\nprint(x + 2)',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: '5' },
                    { id: 'b', text: '7' },
                    { id: 'c', text: '52' },
                    { id: 'd', text: 'Error' }
                  ],
                  correctAnswer: 'b',
                  points: 10
                },
                {
                  id: 4,
                  text: 'Which of the following is used to define a function in Python?',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: 'function' },
                    { id: 'b', text: 'define' },
                    { id: 'c', text: 'def' },
                    { id: 'd', text: 'func' }
                  ],
                  correctAnswer: 'c',
                  points: 10
                },
                {
                  id: 5,
                  text: 'Select all data types that are built-in in Python.',
                  type: 'multiple-select',
                  options: [
                    { id: 'a', text: 'Integer' },
                    { id: 'b', text: 'String' },
                    { id: 'c', text: 'Array' },
                    { id: 'd', text: 'Dictionary' },
                    { id: 'e', text: 'Struct' }
                  ],
                  correctAnswer: ['a', 'b', 'd'],
                  points: 15
                }
              ]
            };
            break;
            
          default:
            mockQuiz = {
              id: parseInt(quizId),
              title: `Quiz ${quizId}`,
              description: `This is a placeholder for quiz ${quizId}`,
              moduleId: 1,
              moduleTitle: 'Module Title',
              timeLimit: 10, // minutes
              passingScore: 70,
              questions: [
                {
                  id: 1,
                  text: 'Sample question 1',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: 'Option A' },
                    { id: 'b', text: 'Option B' },
                    { id: 'c', text: 'Option C' },
                    { id: 'd', text: 'Option D' }
                  ],
                  correctAnswer: 'b',
                  points: 10
                },
                {
                  id: 2,
                  text: 'Sample question 2',
                  type: 'multiple-choice',
                  options: [
                    { id: 'a', text: 'Option A' },
                    { id: 'b', text: 'Option B' },
                    { id: 'c', text: 'Option C' },
                    { id: 'd', text: 'Option D' }
                  ],
                  correctAnswer: 'c',
                  points: 10
                }
              ]
            };
        }
        
        setQuiz(mockQuiz);
        setTimeLeft(mockQuiz.timeLimit * 60); // Convert minutes to seconds
        setLoading(false);
      } catch (error) {
        console.error('Error fetching quiz:', error);
        setLoading(false);
      }
    };
    
    fetchQuiz();
  }, [quizId]);
  
  // Timer effect
  useEffect(() => {
    if (!loading && timeLeft > 0 && !quizSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(timer);
            handleSubmitQuiz();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [loading, timeLeft, quizSubmitted]);
  
  const handleAnswerSelect = (questionId, answerId, isMultipleSelect = false) => {
    if (quizSubmitted) return;
    
    setSelectedAnswers(prev => {
      if (isMultipleSelect) {
        // For multiple select questions
        const currentSelections = prev[questionId] || [];
        if (currentSelections.includes(answerId)) {
          // If already selected, remove it
          return {
            ...prev,
            [questionId]: currentSelections.filter(id => id !== answerId)
          };
        } else {
          // If not selected, add it
          return {
            ...prev,
            [questionId]: [...currentSelections, answerId]
          };
        }
      } else {
        // For single select questions
        return {
          ...prev,
          [questionId]: answerId
        };
      }
    });
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };
  
  const handleSubmitQuiz = () => {
    // Calculate results
    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;
    
    quiz.questions.forEach(question => {
      totalPoints += question.points;
      
      const userAnswer = selectedAnswers[question.id];
      
      if (question.type === 'multiple-select') {
        // For multiple select, check if arrays match (regardless of order)
        const userSelections = userAnswer || [];
        const correctSelections = question.correctAnswer;
        
        if (
          userSelections.length === correctSelections.length &&
          userSelections.every(selection => correctSelections.includes(selection))
        ) {
          earnedPoints += question.points;
          correctAnswers++;
        }
      } else {
        // For multiple choice
        if (userAnswer === question.correctAnswer) {
          earnedPoints += question.points;
          correctAnswers++;
        }
      }
    });
    
    const percentageScore = Math.round((earnedPoints / totalPoints) * 100);
    const passed = percentageScore >= quiz.passingScore;
    
    setResults({
      totalQuestions: quiz.questions.length,
      correctAnswers,
      earnedPoints,
      totalPoints,
      percentageScore,
      passed
    });
    
    setQuizSubmitted(true);
  };
  
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const handleReturnToLearningPath = () => {
    navigate('/learning-path');
  };
  
  if (loading) {
    return (
      <div className="quiz-container">
        <div className="loading-spinner">Loading quiz...</div>
      </div>
    );
  }
  
  // Current question
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isMultipleSelect = currentQuestion.type === 'multiple-select';
  const userAnswer = selectedAnswers[currentQuestion.id] || (isMultipleSelect ? [] : null);
  
  // If quiz is submitted, show results
  if (quizSubmitted) {
    return (
      <div className="quiz-container">
        <div className="quiz-results">
          <h1>Quiz Results</h1>
          <h2>{quiz.title}</h2>
          
          <div className="results-summary">
            <div className="result-card">
              <div className="result-value">{results.percentageScore}%</div>
              <div className="result-label">Score</div>
            </div>
            
            <div className="result-card">
              <div className="result-value">{results.correctAnswers}/{results.totalQuestions}</div>
              <div className="result-label">Correct Answers</div>
            </div>
            
            <div className="result-card">
              <div className="result-value">{results.passed ? 'Passed' : 'Failed'}</div>
              <div className="result-label">Status</div>
            </div>
          </div>
          
          <div className="results-message">
            {results.passed ? (
              <div className="success-message">
                <h3>Congratulations! You passed the quiz.</h3>
                <p>You've demonstrated a good understanding of the material. Keep up the good work!</p>
              </div>
            ) : (
              <div className="failure-message">
                <h3>You didn't pass this time.</h3>
                <p>Don't worry! Review the material and try again. You need {quiz.passingScore}% to pass.</p>
              </div>
            )}
          </div>
          
          <div className="results-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowFeedback(!showFeedback)}
            >
              {showFeedback ? 'Hide Feedback' : 'Show Feedback'}
            </button>
            
            <button 
              className="btn btn-outline"
              onClick={handleReturnToLearningPath}
            >
              Return to Learning Path
            </button>
          </div>
          
          {showFeedback && (
            <div className="question-feedback">
              <h3>Question Feedback</h3>
              
              {quiz.questions.map((question, index) => {
                const userAns = selectedAnswers[question.id] || (question.type === 'multiple-select' ? [] : null);
                const isCorrect = question.type === 'multiple-select'
                  ? userAns.length === question.correctAnswer.length && 
                    userAns.every(ans => question.correctAnswer.includes(ans))
                  : userAns === question.correctAnswer;
                
                return (
                  <div 
                    key={question.id} 
                    className={`feedback-item ${isCorrect ? 'correct' : 'incorrect'}`}
                  >
                    <div className="question-number">Question {index + 1}</div>
                    <div className="question-text">{question.text}</div>
                    
                    <div className="answer-feedback">
                      <div className="your-answer">
                        <strong>Your answer: </strong>
                        {question.type === 'multiple-select' 
                          ? userAns.length > 0 
                            ? userAns.map(ans => {
                                const option = question.options.find(opt => opt.id === ans);
                                return option ? option.text : ans;
                              }).join(', ')
                            : 'No selection'
                          : userAns 
                            ? question.options.find(opt => opt.id === userAns)?.text || userAns
                            : 'No selection'
                        }
                      </div>
                      
                      <div className="correct-answer">
                        <strong>Correct answer: </strong>
                        {question.type === 'multiple-select'
                          ? question.correctAnswer.map(ans => {
                              const option = question.options.find(opt => opt.id === ans);
                              return option ? option.text : ans;
                            }).join(', ')
                          : question.options.find(opt => opt.id === question.correctAnswer)?.text || question.correctAnswer
                        }
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <div className="quiz-navigation">
          <Link to="/learning-path" className="back-link">
            <i className="fas fa-arrow-left"></i> Back to Learning Path
          </Link>
          <div className="quiz-timer">
            <i className="far fa-clock"></i> Time Left: {formatTime(timeLeft)}
          </div>
        </div>
        
        <div className="quiz-info">
          <h1>{quiz.title}</h1>
          <p>{quiz.description}</p>
          <div className="quiz-meta">
            <span className="module-name">{quiz.moduleTitle}</span>
            <span className="question-count">{quiz.questions.length} Questions</span>
            <span className="passing-score">Passing Score: {quiz.passingScore}%</span>
          </div>
        </div>
      </div>
      
      <div className="quiz-progress">
        <div className="progress-text">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <div className="question-container">
        <div className="question-header">
          <div className="question-number">Question {currentQuestionIndex + 1}</div>
          <div className="question-type">
            {isMultipleSelect ? 'Multiple Select' : 'Multiple Choice'}
          </div>
        </div>
        
        <div className="question-text">
          {currentQuestion.text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < currentQuestion.text.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        
        <div className="question-instructions">
          {isMultipleSelect 
            ? 'Select all that apply.' 
            : 'Select the best answer.'}
        </div>
        
        <div className="answer-options">
          {currentQuestion.options.map(option => (
            <div 
              key={option.id}
              className={`answer-option ${
                isMultipleSelect 
                  ? userAnswer.includes(option.id) ? 'selected' : ''
                  : userAnswer === option.id ? 'selected' : ''
              }`}
              onClick={() => handleAnswerSelect(
                currentQuestion.id, 
                option.id, 
                isMultipleSelect
              )}
            >
              <div className="option-marker">
                {isMultipleSelect ? (
                  <div className="checkbox">
                    {userAnswer.includes(option.id) && <div className="checkbox-inner"></div>}
                  </div>
                ) : (
                  <div className="radio">
                    {userAnswer === option.id && <div className="radio-inner"></div>}
                  </div>
                )}
              </div>
              <div className="option-text">{option.text}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="quiz-navigation-buttons">
        <button 
          className="btn btn-outline"
          onClick={handlePrevQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <i className="fas fa-arrow-left"></i> Previous
        </button>
        
        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button 
            className="btn btn-primary"
            onClick={handleNextQuestion}
          >
            Next <i className="fas fa-arrow-right"></i>
          </button>
        ) : (
          <button 
            className="btn btn-primary submit-btn"
            onClick={handleSubmitQuiz}
          >
            Submit Quiz
          </button>
        )}
      </div>
      
      <div className="question-navigation">
        {quiz.questions.map((_, index) => (
          <div 
            key={index}
            className={`question-dot ${
              index === currentQuestionIndex 
                ? 'active' 
                : selectedAnswers[quiz.questions[index].id] 
                  ? 'answered' 
                  : ''
            }`}
            onClick={() => setCurrentQuestionIndex(index)}
          >
            {index + 1}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuizView; 