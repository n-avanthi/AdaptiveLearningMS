import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        coursesInProgress: 0,
        coursesCompleted: 0,
        totalQuizzesTaken: 0,
        averageScore: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [recommendedCourses, setRecommendedCourses] = useState([]);

    useEffect(() => {
        // Fetch user stats, recent activity and recommended courses
        // This would be replaced with actual API calls
        const fetchDashboardData = async () => {
            try {
                // Simulate API call delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Mock data - would be replaced with actual API responses
                setStats({
                    coursesInProgress: 3,
                    coursesCompleted: 2,
                    totalQuizzesTaken: 12,
                    averageScore: 85
                });

                setRecentActivity([
                    { id: 1, type: 'lesson', title: 'Introduction to Machine Learning', date: '2023-06-10', progress: 75 },
                    { id: 2, type: 'quiz', title: 'Python Basics Quiz', date: '2023-06-08', score: 90 },
                    { id: 3, type: 'lesson', title: 'Data Structures Overview', date: '2023-06-05', progress: 100 }
                ]);

                setRecommendedCourses([
                    { id: 1, title: 'Advanced Python Programming', description: 'Take your Python skills to the next level', level: 'Intermediate', duration: '4 weeks' },
                    { id: 2, title: 'Data Visualization with Matplotlib', description: 'Learn to create compelling visualizations', level: 'Beginner', duration: '2 weeks' },
                    { id: 3, title: 'Introduction to Neural Networks', description: 'Understand the basics of neural networks', level: 'Advanced', duration: '6 weeks' }
                ]);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-spinner">Loading...</div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Welcome back, {user?.first_name || 'Student'}!</h1>
                <p>Here's an overview of your learning journey</p>
            </div>

            <div className="dashboard-stats">
                <div className="stat-card">
                    <h3>{stats.coursesInProgress}</h3>
                    <p>Courses In Progress</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.coursesCompleted}</h3>
                    <p>Courses Completed</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.totalQuizzesTaken}</h3>
                    <p>Quizzes Taken</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.averageScore}%</h3>
                    <p>Average Score</p>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>Continue Learning</h2>
                        <Link to="/learning-path" className="view-all">View All</Link>
                    </div>

                    <div className="activity-list">
                        {recentActivity.map(activity => (
                            <div key={activity.id} className="activity-card">
                                <div className="activity-icon">
                                    {activity.type === 'lesson' ? (
                                        <i className="fas fa-book"></i>
                                    ) : (
                                        <i className="fas fa-question-circle"></i>
                                    )}
                                </div>
                                <div className="activity-details">
                                    <h3>{activity.title}</h3>
                                    <p>Last accessed: {activity.date}</p>
                                    {activity.type === 'lesson' ? (
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${activity.progress}%` }}
                                            ></div>
                                            <span>{activity.progress}% complete</span>
                                        </div>
                                    ) : (
                                        <p>Score: {activity.score}%</p>
                                    )}
                                </div>
                                <Link
                                    to={activity.type === 'lesson' ? `/lesson/${activity.id}` : `/quiz/${activity.id}`}
                                    className="btn btn-primary"
                                >
                                    {activity.type === 'lesson' ? 'Continue' : 'Review'}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>Recommended for You</h2>
                        <Link to="/courses" className="view-all">Browse All Courses</Link>
                    </div>

                    <div className="course-grid">
                        {recommendedCourses.map(course => (
                            <div key={course.id} className="course-card">
                                <h3>{course.title}</h3>
                                <p>{course.description}</p>
                                <div className="course-meta">
                                    <span className="course-level">{course.level}</span>
                                    <span className="course-duration">{course.duration}</span>
                                </div>
                                <Link to={`/course/${course.id}`} className="btn btn-outline">
                                    View Course
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 