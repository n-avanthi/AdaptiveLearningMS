import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import './LearningPath.css';

const LearningPath = () => {
    const { currentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [learningPath, setLearningPath] = useState({
        currentLevel: '',
        progress: 0,
        modules: [],
        strengths: [],
        weaknesses: []
    });
    const [activeModule, setActiveModule] = useState(null);

    useEffect(() => {
        // Fetch user's learning path
        // This would be replaced with actual API calls
        const fetchLearningPath = async () => {
            try {
                setLoading(true);

                // In a real app, this would be an API call to the learning engine
                // const response = await axios.get(`/api/learning-path/${currentUser.id}`);
                // const data = response.data;

                // Mock data for demonstration
                await new Promise(resolve => setTimeout(resolve, 1000));

                const mockLearningPath = {
                    currentLevel: 'Intermediate',
                    progress: 65,
                    modules: [
                        {
                            id: 1,
                            title: 'Python Fundamentals',
                            description: 'Master the basics of Python programming',
                            status: 'completed',
                            progress: 100,
                            lessons: [
                                { id: 101, title: 'Introduction to Python', status: 'completed', type: 'lesson' },
                                { id: 102, title: 'Variables and Data Types', status: 'completed', type: 'lesson' },
                                { id: 103, title: 'Control Flow', status: 'completed', type: 'lesson' },
                                { id: 104, title: 'Functions', status: 'completed', type: 'lesson' },
                                { id: 105, title: 'Python Basics Quiz', status: 'completed', type: 'quiz', score: 92 }
                            ]
                        },
                        {
                            id: 2,
                            title: 'Data Structures',
                            description: 'Learn about lists, dictionaries, sets, and tuples',
                            status: 'in_progress',
                            progress: 60,
                            lessons: [
                                { id: 201, title: 'Lists and Arrays', status: 'completed', type: 'lesson' },
                                { id: 202, title: 'Dictionaries', status: 'completed', type: 'lesson' },
                                { id: 203, title: 'Sets', status: 'in_progress', type: 'lesson' },
                                { id: 204, title: 'Tuples', status: 'not_started', type: 'lesson' },
                                { id: 205, title: 'Data Structures Quiz', status: 'not_started', type: 'quiz' }
                            ]
                        },
                        {
                            id: 3,
                            title: 'Object-Oriented Programming',
                            description: 'Understand classes, objects, inheritance, and polymorphism',
                            status: 'not_started',
                            progress: 0,
                            lessons: [
                                { id: 301, title: 'Classes and Objects', status: 'not_started', type: 'lesson' },
                                { id: 302, title: 'Inheritance', status: 'not_started', type: 'lesson' },
                                { id: 303, title: 'Polymorphism', status: 'not_started', type: 'lesson' },
                                { id: 304, title: 'Encapsulation', status: 'not_started', type: 'lesson' },
                                { id: 305, title: 'OOP Quiz', status: 'not_started', type: 'quiz' }
                            ]
                        },
                        {
                            id: 4,
                            title: 'Advanced Python Concepts',
                            description: 'Explore decorators, generators, and context managers',
                            status: 'locked',
                            progress: 0,
                            lessons: [
                                { id: 401, title: 'Decorators', status: 'locked', type: 'lesson' },
                                { id: 402, title: 'Generators', status: 'locked', type: 'lesson' },
                                { id: 403, title: 'Context Managers', status: 'locked', type: 'lesson' },
                                { id: 404, title: 'Advanced Python Quiz', status: 'locked', type: 'quiz' }
                            ]
                        }
                    ],
                    strengths: ['Control Flow', 'Functions', 'Lists'],
                    weaknesses: ['Dictionaries', 'Sets']
                };

                setLearningPath(mockLearningPath);
                setActiveModule(mockLearningPath.modules.find(m => m.status === 'in_progress') || mockLearningPath.modules[0]);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching learning path:', error);
                setLoading(false);
            }
        };

        fetchLearningPath();
    }, [currentUser]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <span className="status-icon completed">✓</span>;
            case 'in_progress':
                return <span className="status-icon in-progress">▶</span>;
            case 'not_started':
                return <span className="status-icon not-started">○</span>;
            case 'locked':
                return <span className="status-icon locked">🔒</span>;
            default:
                return null;
        }
    };

    const getStatusClass = (status) => {
        return `status-${status.replace('_', '-')}`;
    };

    if (loading) {
        return (
            <div className="learning-path-container">
                <div className="loading-spinner">Loading your personalized learning path...</div>
            </div>
        );
    }

    return (
        <div className="learning-path-container">
            <div className="learning-path-header">
                <h1>Your Learning Path</h1>
                <div className="learning-path-info">
                    <div className="level-badge">{learningPath.currentLevel}</div>
                    <div className="overall-progress">
                        <div className="progress-label">Overall Progress: {learningPath.progress}%</div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${learningPath.progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="learning-path-insights">
                <div className="insight-card">
                    <h3>Your Strengths</h3>
                    <ul className="tag-list">
                        {learningPath.strengths.map((strength, index) => (
                            <li key={index} className="tag strength">{strength}</li>
                        ))}
                    </ul>
                </div>

                <div className="insight-card">
                    <h3>Areas to Improve</h3>
                    <ul className="tag-list">
                        {learningPath.weaknesses.map((weakness, index) => (
                            <li key={index} className="tag weakness">{weakness}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="learning-path-content">
                <div className="modules-sidebar">
                    <h2>Modules</h2>
                    <ul className="module-list">
                        {learningPath.modules.map(module => (
                            <li
                                key={module.id}
                                className={`module-item ${getStatusClass(module.status)} ${activeModule && activeModule.id === module.id ? 'active' : ''}`}
                                onClick={() => module.status !== 'locked' && setActiveModule(module)}
                            >
                                {getStatusIcon(module.status)}
                                <div className="module-info">
                                    <h3>{module.title}</h3>
                                    <div className="module-progress">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${module.progress}%` }}
                                            ></div>
                                        </div>
                                        <span>{module.progress}%</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="module-content">
                    {activeModule && (
                        <>
                            <div className="module-header">
                                <h2>{activeModule.title}</h2>
                                <p>{activeModule.description}</p>
                                <div className="module-status">
                                    Status: <span className={getStatusClass(activeModule.status)}>
                                        {activeModule.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                    </span>
                                </div>
                            </div>

                            <div className="lessons-list">
                                <h3>Lessons & Quizzes</h3>
                                {activeModule.lessons.map(lesson => (
                                    <div
                                        key={lesson.id}
                                        className={`lesson-item ${getStatusClass(lesson.status)}`}
                                    >
                                        <div className="lesson-info">
                                            {getStatusIcon(lesson.status)}
                                            <div>
                                                <h4>{lesson.title}</h4>
                                                <span className="lesson-type">
                                                    {lesson.type === 'quiz' ? 'Quiz' : 'Lesson'}
                                                    {lesson.score && ` - Score: ${lesson.score}%`}
                                                </span>
                                            </div>
                                        </div>

                                        {lesson.status !== 'locked' && (
                                            <Link
                                                to={lesson.type === 'quiz' ? `/quiz/${lesson.id}` : `/lesson/${lesson.id}`}
                                                className="btn btn-primary"
                                            >
                                                {lesson.status === 'completed' ? 'Review' :
                                                    lesson.status === 'in_progress' ? 'Continue' : 'Start'}
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LearningPath; 