import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import './TeacherDashboard.css';

const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    averageCompletion: 0,
    averageScore: 0
  });
  const [courses, setCourses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Fetch teacher dashboard data
    // This would be replaced with actual API calls
    const fetchDashboardData = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - would be replaced with actual API responses
        setStats({
          totalStudents: 125,
          totalCourses: 5,
          averageCompletion: 68,
          averageScore: 82
        });
        
        setCourses([
          { 
            id: 1, 
            title: 'Introduction to Python', 
            students: 45, 
            modules: 8, 
            completion: 75,
            lastUpdated: '2023-05-15'
          },
          { 
            id: 2, 
            title: 'Data Structures and Algorithms', 
            students: 32, 
            modules: 12, 
            completion: 62,
            lastUpdated: '2023-06-02'
          },
          { 
            id: 3, 
            title: 'Web Development Fundamentals', 
            students: 28, 
            modules: 10, 
            completion: 58,
            lastUpdated: '2023-06-10'
          },
          { 
            id: 4, 
            title: 'Machine Learning Basics', 
            students: 20, 
            modules: 6, 
            completion: 45,
            lastUpdated: '2023-06-18'
          }
        ]);
        
        setRecentSubmissions([
          { 
            id: 1, 
            studentName: 'John Doe', 
            courseTitle: 'Introduction to Python', 
            type: 'quiz', 
            title: 'Python Basics Quiz', 
            score: 85, 
            submittedAt: '2023-06-20 14:30'
          },
          { 
            id: 2, 
            studentName: 'Jane Smith', 
            courseTitle: 'Data Structures and Algorithms', 
            type: 'assignment', 
            title: 'Linked List Implementation', 
            score: 92, 
            submittedAt: '2023-06-19 16:45'
          },
          { 
            id: 3, 
            studentName: 'Mike Johnson', 
            courseTitle: 'Web Development Fundamentals', 
            type: 'quiz', 
            title: 'HTML & CSS Quiz', 
            score: 78, 
            submittedAt: '2023-06-19 10:15'
          },
          { 
            id: 4, 
            studentName: 'Sarah Williams', 
            courseTitle: 'Introduction to Python', 
            type: 'assignment', 
            title: 'File Handling Exercise', 
            score: 88, 
            submittedAt: '2023-06-18 13:20'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching teacher dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="teacher-dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard-container">
      <div className="teacher-dashboard-header">
        <h1>Teacher Dashboard</h1>
        <p>Welcome back, {user?.first_name || 'Instructor'}!</p>
      </div>
      
      <div className="teacher-dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          My Courses
        </button>
        <button 
          className={`tab-button ${activeTab === 'submissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          Recent Submissions
        </button>
      </div>
      
      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{stats.totalStudents}</h3>
              <p>Total Students</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalCourses}</h3>
              <p>Active Courses</p>
            </div>
            <div className="stat-card">
              <h3>{stats.averageCompletion}%</h3>
              <p>Avg. Completion Rate</p>
            </div>
            <div className="stat-card">
              <h3>{stats.averageScore}%</h3>
              <p>Avg. Student Score</p>
            </div>
          </div>
          
          <div className="dashboard-actions">
            <Link to="/create-course" className="btn btn-primary">
              <i className="fas fa-plus"></i> Create New Course
            </Link>
            <Link to="/analytics" className="btn btn-secondary">
              <i className="fas fa-chart-bar"></i> View Detailed Analytics
            </Link>
          </div>
          
          <div className="quick-summary">
            <div className="summary-section">
              <h2>Recent Course Activity</h2>
              <div className="course-list">
                {courses.slice(0, 2).map(course => (
                  <div key={course.id} className="course-item">
                    <h3>{course.title}</h3>
                    <div className="course-meta">
                      <span>{course.students} Students</span>
                      <span>Last updated: {course.lastUpdated}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${course.completion}%` }}
                      ></div>
                      <span>{course.completion}% avg. completion</span>
                    </div>
                    <Link to={`/course/${course.id}/manage`} className="btn btn-outline">
                      Manage Course
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="summary-section">
              <h2>Recent Submissions</h2>
              <div className="submission-list">
                {recentSubmissions.slice(0, 2).map(submission => (
                  <div key={submission.id} className="submission-item">
                    <div className="submission-header">
                      <h3>{submission.title}</h3>
                      <span className={`score-badge ${submission.score >= 80 ? 'high' : submission.score >= 60 ? 'medium' : 'low'}`}>
                        {submission.score}%
                      </span>
                    </div>
                    <div className="submission-meta">
                      <span>Student: {submission.studentName}</span>
                      <span>Course: {submission.courseTitle}</span>
                      <span>Submitted: {submission.submittedAt}</span>
                    </div>
                    <Link to={`/submission/${submission.id}`} className="btn btn-outline">
                      Review
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'courses' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>My Courses</h2>
            <Link to="/create-course" className="btn btn-primary">
              <i className="fas fa-plus"></i> Create New Course
            </Link>
          </div>
          
          <div className="courses-table-container">
            <table className="courses-table">
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Students</th>
                  <th>Modules</th>
                  <th>Avg. Completion</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td>{course.title}</td>
                    <td>{course.students}</td>
                    <td>{course.modules}</td>
                    <td>
                      <div className="table-progress">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${course.completion}%` }}
                        ></div>
                        <span>{course.completion}%</span>
                      </div>
                    </td>
                    <td>{course.lastUpdated}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/course/${course.id}/manage`} className="action-link">
                          Manage
                        </Link>
                        <Link to={`/course/${course.id}/analytics`} className="action-link">
                          Analytics
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'submissions' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>Recent Submissions</h2>
          </div>
          
          <div className="submissions-list">
            {recentSubmissions.map(submission => (
              <div key={submission.id} className="submission-card">
                <div className="submission-card-header">
                  <div>
                    <h3>{submission.title}</h3>
                    <p>{submission.courseTitle}</p>
                  </div>
                  <span className={`score-badge ${submission.score >= 80 ? 'high' : submission.score >= 60 ? 'medium' : 'low'}`}>
                    {submission.score}%
                  </span>
                </div>
                
                <div className="submission-card-content">
                  <div className="submission-info">
                    <p><strong>Student:</strong> {submission.studentName}</p>
                    <p><strong>Type:</strong> {submission.type.charAt(0).toUpperCase() + submission.type.slice(1)}</p>
                    <p><strong>Submitted:</strong> {submission.submittedAt}</p>
                  </div>
                  
                  <div className="submission-actions">
                    <Link to={`/submission/${submission.id}`} className="btn btn-primary">
                      Review
                    </Link>
                    <button className="btn btn-outline">Provide Feedback</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard; 