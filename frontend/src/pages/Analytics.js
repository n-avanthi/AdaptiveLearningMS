import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import './Analytics.css';

// Mock chart components - in a real app, you would use a library like Chart.js
const LineChart = ({ data, title }) => (
    <div className="chart-container">
        <h3>{title}</h3>
        <div className="mock-chart line-chart">
            <div className="chart-placeholder">
                <p>Line Chart: {title}</p>
                <p className="chart-data">{JSON.stringify(data).substring(0, 50)}...</p>
            </div>
        </div>
    </div>
);

const BarChart = ({ data, title }) => (
    <div className="chart-container">
        <h3>{title}</h3>
        <div className="mock-chart bar-chart">
            <div className="chart-placeholder">
                <p>Bar Chart: {title}</p>
                <p className="chart-data">{JSON.stringify(data).substring(0, 50)}...</p>
            </div>
        </div>
    </div>
);

const PieChart = ({ data, title }) => (
    <div className="chart-container">
        <h3>{title}</h3>
        <div className="mock-chart pie-chart">
            <div className="chart-placeholder">
                <p>Pie Chart: {title}</p>
                <p className="chart-data">{JSON.stringify(data).substring(0, 50)}...</p>
            </div>
        </div>
    </div>
);

const Analytics = () => {
    const { currentUser } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('month');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                // In a real app, this would be an API call
                // const response = await axios.get(`/api/analytics/students/${currentUser.id}`);

                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock data
                const mockAnalytics = {
                    overview: {
                        totalLessonsCompleted: 24,
                        totalQuizzesTaken: 18,
                        averageScore: 82,
                        timeSpent: 1840, // minutes
                        learningStreak: 7, // days
                    },
                    progress: {
                        byModule: [
                            { name: 'Python Basics', progress: 100 },
                            { name: 'Data Structures', progress: 75 },
                            { name: 'Algorithms', progress: 60 },
                            { name: 'Object-Oriented Programming', progress: 40 },
                            { name: 'Web Development', progress: 20 },
                        ],
                        byWeek: [
                            { week: 'Week 1', progress: 90 },
                            { week: 'Week 2', progress: 85 },
                            { week: 'Week 3', progress: 70 },
                            { week: 'Week 4', progress: 80 },
                        ],
                    },
                    performance: {
                        quizScores: [
                            { quiz: 'Python Basics Quiz', score: 90, date: '2023-05-15' },
                            { quiz: 'Data Structures Quiz 1', score: 85, date: '2023-05-22' },
                            { quiz: 'Algorithms Quiz 1', score: 75, date: '2023-05-29' },
                            { quiz: 'Data Structures Quiz 2', score: 80, date: '2023-06-05' },
                            { quiz: 'OOP Concepts Quiz', score: 78, date: '2023-06-12' },
                        ],
                        scoresByTopic: [
                            { topic: 'Python Syntax', score: 92 },
                            { topic: 'Functions', score: 88 },
                            { topic: 'Lists & Arrays', score: 85 },
                            { topic: 'Dictionaries', score: 80 },
                            { topic: 'Loops', score: 90 },
                            { topic: 'Recursion', score: 70 },
                            { topic: 'Classes', score: 75 },
                        ],
                        timePerModule: [
                            { module: 'Python Basics', time: 320 }, // minutes
                            { module: 'Data Structures', time: 480 },
                            { module: 'Algorithms', time: 560 },
                            { module: 'Object-Oriented Programming', time: 280 },
                            { module: 'Web Development', time: 200 },
                        ],
                    },
                    insights: {
                        strengths: [
                            { topic: 'Python Syntax', score: 92 },
                            { topic: 'Loops', score: 90 },
                            { topic: 'Functions', score: 88 },
                        ],
                        weaknesses: [
                            { topic: 'Recursion', score: 70 },
                            { topic: 'Classes', score: 75 },
                            { topic: 'Exception Handling', score: 76 },
                        ],
                        recommendations: [
                            {
                                id: 1,
                                title: 'Recursion Deep Dive',
                                type: 'lesson',
                                description: 'A comprehensive lesson on recursion with practical examples.'
                            },
                            {
                                id: 2,
                                title: 'Object-Oriented Programming Workshop',
                                type: 'module',
                                description: 'Interactive exercises to strengthen your OOP skills.'
                            },
                            {
                                id: 3,
                                title: 'Exception Handling Practice',
                                type: 'quiz',
                                description: 'Test your knowledge of exception handling with this practice quiz.'
                            },
                        ],
                        learningPace: {
                            current: 'Above Average',
                            trend: 'Improving',
                            data: [
                                { week: 'Week 1', pace: 1.0 },
                                { week: 'Week 2', pace: 1.1 },
                                { week: 'Week 3', pace: 1.2 },
                                { week: 'Week 4', pace: 1.3 },
                            ]
                        }
                    }
                };

                setAnalytics(mockAnalytics);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching analytics:', error);
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [currentUser]);

    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const renderOverview = () => {
        if (!analytics) return null;

        const { overview, progress, performance } = analytics;

        return (
            <div className="analytics-overview">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📚</div>
                        <div className="stat-value">{overview.totalLessonsCompleted}</div>
                        <div className="stat-label">Lessons Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📝</div>
                        <div className="stat-value">{overview.totalQuizzesTaken}</div>
                        <div className="stat-label">Quizzes Taken</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🎯</div>
                        <div className="stat-value">{overview.averageScore}%</div>
                        <div className="stat-label">Average Score</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-value">{formatTime(overview.timeSpent)}</div>
                        <div className="stat-label">Total Time Spent</div>
                    </div>
                </div>

                <div className="charts-row">
                    <LineChart
                        data={progress.byWeek}
                        title="Weekly Progress"
                    />
                    <BarChart
                        data={performance.scoresByTopic}
                        title="Performance by Topic"
                    />
                </div>

                <div className="learning-streak">
                    <h3>Current Learning Streak</h3>
                    <div className="streak-display">
                        <div className="streak-value">{overview.learningStreak}</div>
                        <div className="streak-label">days</div>
                    </div>
                    <p>Keep learning daily to maintain your streak!</p>
                </div>
            </div>
        );
    };

    const renderProgress = () => {
        if (!analytics) return null;

        const { progress } = analytics;

        return (
            <div className="analytics-progress">
                <div className="module-progress">
                    <h3>Progress by Module</h3>
                    <div className="progress-bars">
                        {progress.byModule.map((module, index) => (
                            <div key={index} className="module-progress-item">
                                <div className="module-info">
                                    <span className="module-name">{module.name}</span>
                                    <span className="module-percentage">{module.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${module.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="charts-row">
                    <LineChart
                        data={progress.byWeek}
                        title="Weekly Progress Trend"
                    />
                    <PieChart
                        data={analytics.performance.timePerModule}
                        title="Time Distribution by Module"
                    />
                </div>

                <div className="completion-estimate">
                    <h3>Estimated Completion</h3>
                    <div className="estimate-info">
                        <p>Based on your current pace, you are expected to complete the curriculum by:</p>
                        <div className="estimate-date">August 15, 2023</div>
                        <p className="estimate-note">Keep up the good work to meet or beat this estimate!</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderPerformance = () => {
        if (!analytics) return null;

        const { performance } = analytics;

        return (
            <div className="analytics-performance">
                <div className="date-range-selector">
                    <button
                        className={`range-btn ${dateRange === 'week' ? 'active' : ''}`}
                        onClick={() => setDateRange('week')}
                    >
                        Week
                    </button>
                    <button
                        className={`range-btn ${dateRange === 'month' ? 'active' : ''}`}
                        onClick={() => setDateRange('month')}
                    >
                        Month
                    </button>
                    <button
                        className={`range-btn ${dateRange === 'all' ? 'active' : ''}`}
                        onClick={() => setDateRange('all')}
                    >
                        All Time
                    </button>
                </div>

                <div className="charts-row">
                    <LineChart
                        data={performance.quizScores}
                        title="Quiz Performance Over Time"
                    />
                    <BarChart
                        data={performance.scoresByTopic}
                        title="Performance by Topic"
                    />
                </div>

                <div className="recent-quizzes">
                    <h3>Recent Quiz Results</h3>
                    <div className="quiz-results-list">
                        {performance.quizScores.map((quiz, index) => (
                            <div key={index} className="quiz-result-item">
                                <div className="quiz-result-info">
                                    <h4>{quiz.quiz}</h4>
                                    <p className="quiz-date">{quiz.date}</p>
                                </div>
                                <div className="quiz-score">
                                    <div className={`score-badge ${quiz.score >= 85 ? 'high' :
                                            quiz.score >= 70 ? 'medium' : 'low'
                                        }`}>
                                        {quiz.score}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="time-analysis">
                    <h3>Time Spent Analysis</h3>
                    <div className="time-chart">
                        <BarChart
                            data={performance.timePerModule}
                            title="Time Spent per Module (minutes)"
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderInsights = () => {
        if (!analytics) return null;

        const { insights } = analytics;

        return (
            <div className="analytics-insights">
                <div className="insights-grid">
                    <div className="insight-card strengths">
                        <h3>Your Strengths</h3>
                        <ul className="topic-list">
                            {insights.strengths.map((topic, index) => (
                                <li key={index} className="topic-item">
                                    <span className="topic-name">{topic.topic}</span>
                                    <div className="topic-score">
                                        <div className="score-badge high">{topic.score}%</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="insight-card weaknesses">
                        <h3>Areas for Improvement</h3>
                        <ul className="topic-list">
                            {insights.weaknesses.map((topic, index) => (
                                <li key={index} className="topic-item">
                                    <span className="topic-name">{topic.topic}</span>
                                    <div className="topic-score">
                                        <div className="score-badge low">{topic.score}%</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="learning-pace">
                    <h3>Your Learning Pace</h3>
                    <div className="pace-info">
                        <div className="pace-status">
                            <div className="pace-label">Current Pace:</div>
                            <div className="pace-value">{insights.learningPace.current}</div>
                        </div>
                        <div className="pace-trend">
                            <div className="pace-label">Trend:</div>
                            <div className="pace-value">{insights.learningPace.trend}</div>
                        </div>
                    </div>
                    <div className="pace-chart">
                        <LineChart
                            data={insights.learningPace.data}
                            title="Learning Pace Over Time"
                        />
                    </div>
                </div>

                <div className="recommendations">
                    <h3>Personalized Recommendations</h3>
                    <div className="recommendation-list">
                        {insights.recommendations.map((rec, index) => (
                            <div key={index} className="recommendation-item">
                                <div className="rec-icon">
                                    {rec.type === 'lesson' ? '📚' :
                                        rec.type === 'quiz' ? '📝' : '📦'}
                                </div>
                                <div className="rec-content">
                                    <h4>{rec.title}</h4>
                                    <p>{rec.description}</p>
                                    <Link to={`/${rec.type}/${rec.id}`} className="btn btn-primary">
                                        {rec.type === 'lesson' ? 'Start Lesson' :
                                            rec.type === 'quiz' ? 'Take Quiz' : 'Explore Module'}
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return renderOverview();
            case 'progress':
                return renderProgress();
            case 'performance':
                return renderPerformance();
            case 'insights':
                return renderInsights();
            default:
                return renderOverview();
        }
    };

    if (loading) {
        return (
            <div className="analytics-container">
                <div className="loading-spinner">Loading analytics data...</div>
            </div>
        );
    }

    return (
        <div className="analytics-container">
            <div className="analytics-header">
                <h1>Learning Analytics</h1>
                <p>Track your progress and performance to optimize your learning journey</p>
            </div>

            <div className="analytics-tabs">
                <button
                    className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
                    onClick={() => setActiveTab('progress')}
                >
                    Progress
                </button>
                <button
                    className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
                    onClick={() => setActiveTab('performance')}
                >
                    Performance
                </button>
                <button
                    className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
                    onClick={() => setActiveTab('insights')}
                >
                    Insights
                </button>
            </div>

            <div className="analytics-content">
                {renderContent()}
            </div>
        </div>
    );
};

export default Analytics; 