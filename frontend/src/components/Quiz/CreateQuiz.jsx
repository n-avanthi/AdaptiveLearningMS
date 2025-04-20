import React, { useState, useEffect } from 'react';
import quizApi from '../../services/quizApi';
import './Quiz.css';

const CreateQuiz = ({ onQuizCreated, initialQuiz = null, isEditing = false }) => {
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        level: 'Beginner', // Default level
        questions: [
            {
                question: '',
                choices: ['', '', '', ''],
                correctAnswer: 0
            }
        ]
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Initialize form with quiz data if editing
    useEffect(() => {
        if (initialQuiz && isEditing) {
            setFormData({
                title: initialQuiz.title || '',
                subject: initialQuiz.subject || '',
                level: initialQuiz.level || 'Beginner',
                questions: initialQuiz.questions || [{
                    question: '',
                    choices: ['', '', '', ''],
                    correctAnswer: 0
                }]
            });
        }
    }, [initialQuiz, isEditing]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index][field] = value;
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const handleChoiceChange = (questionIndex, choiceIndex, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[questionIndex].choices[choiceIndex] = value;
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const handleCorrectAnswerChange = (questionIndex, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[questionIndex].correctAnswer = parseInt(value, 10);
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            questions: [
                ...formData.questions,
                {
                    question: '',
                    choices: ['', '', '', ''],
                    correctAnswer: 0
                }
            ]
        });
    };

    const removeQuestion = (index) => {
        if (formData.questions.length > 1) {
            const updatedQuestions = [...formData.questions];
            updatedQuestions.splice(index, 1);
            setFormData({ ...formData, questions: updatedQuestions });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            let response;
            if (isEditing && initialQuiz) {
                // Update existing quiz
                response = await quizApi.updateQuiz(initialQuiz._id, formData);
                setSuccess(true);

                if (onQuizCreated && typeof onQuizCreated === 'function') {
                    onQuizCreated(response.data);
                }
            } else {
                // Create new quiz
                response = await quizApi.createQuiz(formData);
                setSuccess(true);
                setFormData({
                    title: '',
                    subject: '',
                    level: 'Beginner',
                    questions: [
                        {
                            question: '',
                            choices: ['', '', '', ''],
                            correctAnswer: 0
                        }
                    ]
                });

                if (onQuizCreated && typeof onQuizCreated === 'function') {
                    onQuizCreated(response.data);
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save quiz');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-quiz-container">
            <h3>{isEditing ? 'Edit Quiz' : 'Create a New Quiz'}</h3>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">Quiz {isEditing ? 'updated' : 'created'} successfully!</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="title">Quiz Title:</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="subject">Subject:</label>
                    <input
                        type="text"
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="level">Difficulty Level:</label>
                    <select
                        id="level"
                        name="level"
                        value={formData.level}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                    </select>
                </div>

                <h4>Questions</h4>

                {formData.questions.map((question, questionIndex) => (
                    <div key={questionIndex} className="question-container">
                        <h5>Question {questionIndex + 1}</h5>

                        <div className="form-group">
                            <label htmlFor={`question-${questionIndex}`}>Question:</label>
                            <input
                                type="text"
                                id={`question-${questionIndex}`}
                                value={question.question}
                                onChange={(e) => handleQuestionChange(questionIndex, 'question', e.target.value)}
                                required
                            />
                        </div>

                        <div className="choices-container">
                            <p>Choices:</p>
                            {question.choices.map((choice, choiceIndex) => (
                                <div key={choiceIndex} className="choice-group">
                                    <input
                                        type="text"
                                        value={choice}
                                        onChange={(e) => handleChoiceChange(questionIndex, choiceIndex, e.target.value)}
                                        placeholder={`Choice ${choiceIndex + 1}`}
                                        required
                                    />
                                    <label>
                                        <input
                                            type="radio"
                                            name={`correct-answer-${questionIndex}`}
                                            value={choiceIndex}
                                            checked={question.correctAnswer === choiceIndex}
                                            onChange={(e) => handleCorrectAnswerChange(questionIndex, e.target.value)}
                                        />
                                        Correct Answer
                                    </label>
                                </div>
                            ))}
                        </div>

                        {formData.questions.length > 1 && (
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeQuestion(questionIndex)}
                            >
                                Remove Question
                            </button>
                        )}
                    </div>
                ))}

                <button type="button" className="add-btn" onClick={addQuestion}>
                    Add Another Question
                </button>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? (isEditing ? 'Updating Quiz...' : 'Creating Quiz...') : (isEditing ? 'Update Quiz' : 'Create Quiz')}
                </button>
            </form>
        </div>
    );
};

export default CreateQuiz; 