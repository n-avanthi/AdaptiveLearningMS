import React, { useState, useEffect } from "react";
import axios from "../services/api";
import { useNavigate } from "react-router-dom";
import ContentList from "../components/Content/ContentList";
import AddContent from "../components/Content/AddContent";
import "../components/Content/ContentList.css";
import Quiz from '../components/Quiz/Quiz';
import "../styles/Dashboard.css";

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contentList, setContentList] = useState([]);
  const [activeSection, setActiveSection] = useState('content');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("/users/profile");
        setUserData(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError(err.response?.data?.error || "Failed to load profile");
          setLoading(false);
        }
      }
    };

    const fetchContent = async () => {
      try {
        const res = await axios.get("/content/get-content");
        setContentList(res.data);
      } catch (err) {
        console.error("Error fetching content:", err);
      }
    };

    fetchProfile();
    fetchContent();
  }, [navigate]);

  const handleContentAdded = (newContent) => {
    setContentList((prevContentList) => [newContent, ...prevContentList]);
  };

  // Render the active section based on state
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'quiz':
        return userData && <Quiz userData={userData} />;
      case 'content':
      default:
        return (
          <div className="content-section animate-fade-in">
            {(userData?.role === "admin" || userData?.role === "teacher") && (
              <AddContent onContentAdded={handleContentAdded} />
            )}
            <ContentList contentList={contentList} />
          </div>
        );
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="loader"></div>
      <p>Loading dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <h2>Error</h2>
      <p>{error}</p>
      <button onClick={() => navigate("/login")} className="error-button">
        Back to Login
      </button>
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header">
        <div className="user-profile animate-slide-down">
          <div className="user-avatar">
            {userData.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <h2>Welcome, <span className="user-name">{userData.username}!</span></h2>
            <p className="user-role">{userData.role}</p>
            <p className="user-email">{userData.email}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-nav animate-slide-up">
        <button
          className={`nav-button ${activeSection === 'content' ? 'active' : ''}`}
          onClick={() => setActiveSection('content')}
        >
          <span className="nav-icon">📚</span>
          <span className="nav-text">Content</span>
        </button>
        <button
          className={`nav-button ${activeSection === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveSection('quiz')}
        >
          <span className="nav-icon">📝</span>
          <span className="nav-text">Quizzes</span>
        </button>
      </div>

      <div className="dashboard-content">
        {renderActiveSection()}
      </div>
    </div>
  );
};

export default Dashboard;
