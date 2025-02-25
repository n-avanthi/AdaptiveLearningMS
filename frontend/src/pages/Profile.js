import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './Profile.css';

const Profile = () => {
    const { user, updateUserProfile } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [activeTab, setActiveTab] = useState('personal');

    useEffect(() => {
        // Fetch user profile data
        const fetchProfileData = async () => {
            try {
                setLoading(true);

                // In a real app, this would be an API call
                // const response = await axios.get(`/api/users/profile/${user.id}`);
                // const data = response.data;

                // Mock data for demonstration
                await new Promise(resolve => setTimeout(resolve, 1000));

                const mockProfileData = {
                    id: user.id,
                    firstName: user.firstName || 'John',
                    lastName: user.lastName || 'Doe',
                    email: user.email || 'john.doe@example.com',
                    role: user.role || 'student',
                    avatar: user.avatar || 'https://via.placeholder.com/150',
                    phone: '(555) 123-4567',
                    dateOfBirth: '1990-01-01',
                    bio: 'I am a passionate learner interested in programming and data science.',
                    preferences: {
                        emailNotifications: true,
                        pushNotifications: false,
                        darkMode: false,
                        language: 'English'
                    },
                    education: [
                        {
                            id: 1,
                            institution: 'University of Technology',
                            degree: 'Bachelor of Science in Computer Science',
                            startYear: 2015,
                            endYear: 2019
                        }
                    ],
                    achievements: [
                        {
                            id: 1,
                            title: 'Python Fundamentals',
                            date: '2023-03-15',
                            description: 'Completed the Python Fundamentals course with a score of 95%'
                        },
                        {
                            id: 2,
                            title: 'Data Structures',
                            date: '2023-05-20',
                            description: 'Mastered advanced data structures with a perfect quiz score'
                        }
                    ],
                    stats: {
                        coursesCompleted: 5,
                        quizzesTaken: 12,
                        averageScore: 87,
                        totalLearningTime: 45 // hours
                    }
                };

                setProfileData(mockProfileData);
                setFormData(mockProfileData);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching profile data:', error);
                setErrorMessage('Failed to load profile data. Please try again later.');
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name.includes('.')) {
            // Handle nested objects (e.g., preferences.emailNotifications)
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: type === 'checkbox' ? checked : value
                }
            }));
        } else {
            // Handle top-level fields
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);

            // In a real app, this would be an API call
            // await axios.put(`/api/users/profile/${user.id}`, formData);

            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Update local state
            setProfileData(formData);

            // Update user context
            updateUserProfile({
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                avatar: formData.avatar
            });

            setSuccessMessage('Profile updated successfully!');
            setIsEditing(false);
            setLoading(false);

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrorMessage('Failed to update profile. Please try again.');
            setLoading(false);

            // Clear error message after 3 seconds
            setTimeout(() => {
                setErrorMessage('');
            }, 3000);
        }
    };

    const handleCancel = () => {
        setFormData(profileData);
        setIsEditing(false);
        setErrorMessage('');
    };

    if (loading && !profileData) {
        return (
            <div className="profile-container">
                <div className="loading-spinner">Loading profile data...</div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <div className="profile-avatar">
                    <img src={profileData.avatar} alt={`${profileData.firstName} ${profileData.lastName}`} />
                    {isEditing && (
                        <div className="avatar-edit">
                            <label htmlFor="avatar-upload" className="avatar-edit-button">
                                <i className="fas fa-camera"></i>
                            </label>
                            <input
                                type="file"
                                id="avatar-upload"
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    )}
                </div>

                <div className="profile-title">
                    <h1>{profileData.firstName} {profileData.lastName}</h1>
                    <p className="profile-role">{profileData.role === 'teacher' ? 'Instructor' : 'Student'}</p>

                    {!isEditing ? (
                        <button
                            className="btn btn-primary edit-profile-btn"
                            onClick={() => setIsEditing(true)}
                        >
                            <i className="fas fa-edit"></i> Edit Profile
                        </button>
                    ) : (
                        <div className="edit-actions">
                            <button
                                className="btn btn-outline cancel-btn"
                                onClick={handleCancel}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary save-btn"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {(successMessage || errorMessage) && (
                <div className={`alert ${successMessage ? 'alert-success' : 'alert-error'}`}>
                    {successMessage || errorMessage}
                </div>
            )}

            <div className="profile-tabs">
                <button
                    className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('personal')}
                >
                    Personal Information
                </button>
                <button
                    className={`tab-button ${activeTab === 'preferences' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preferences')}
                >
                    Preferences
                </button>
                <button
                    className={`tab-button ${activeTab === 'education' ? 'active' : ''}`}
                    onClick={() => setActiveTab('education')}
                >
                    Education
                </button>
                <button
                    className={`tab-button ${activeTab === 'achievements' ? 'active' : ''}`}
                    onClick={() => setActiveTab('achievements')}
                >
                    Achievements
                </button>
            </div>

            <div className="profile-content">
                {activeTab === 'personal' && (
                    <div className="profile-section">
                        <h2>Personal Information</h2>

                        <form className="profile-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="lastName">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="phone">Phone</label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="dateOfBirth">Date of Birth</label>
                                    <input
                                        type="date"
                                        id="dateOfBirth"
                                        name="dateOfBirth"
                                        value={formData.dateOfBirth}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="role">Role</label>
                                    <input
                                        type="text"
                                        id="role"
                                        name="role"
                                        value={formData.role === 'teacher' ? 'Instructor' : 'Student'}
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="bio">Bio</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    rows={4}
                                ></textarea>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'preferences' && (
                    <div className="profile-section">
                        <h2>Preferences</h2>

                        <form className="profile-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="language">Language</label>
                                    <select
                                        id="language"
                                        name="preferences.language"
                                        value={formData.preferences?.language}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    >
                                        <option value="English">English</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Chinese">Chinese</option>
                                    </select>
                                </div>
                            </div>

                            <div className="checkbox-group">
                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="emailNotifications"
                                        name="preferences.emailNotifications"
                                        checked={formData.preferences?.emailNotifications}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                    <label htmlFor="emailNotifications">Email Notifications</label>
                                </div>

                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="pushNotifications"
                                        name="preferences.pushNotifications"
                                        checked={formData.preferences?.pushNotifications}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                    <label htmlFor="pushNotifications">Push Notifications</label>
                                </div>

                                <div className="checkbox-item">
                                    <input
                                        type="checkbox"
                                        id="darkMode"
                                        name="preferences.darkMode"
                                        checked={formData.preferences?.darkMode}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                    />
                                    <label htmlFor="darkMode">Dark Mode</label>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'education' && (
                    <div className="profile-section">
                        <h2>Education</h2>

                        {profileData.education.map(edu => (
                            <div key={edu.id} className="education-item">
                                <div className="education-header">
                                    <h3>{edu.institution}</h3>
                                    <p className="education-years">{edu.startYear} - {edu.endYear || 'Present'}</p>
                                </div>
                                <p className="education-degree">{edu.degree}</p>

                                {isEditing && (
                                    <div className="education-actions">
                                        <button className="btn-icon edit-btn">
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button className="btn-icon delete-btn">
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isEditing && (
                            <button className="btn btn-outline add-btn">
                                <i className="fas fa-plus"></i> Add Education
                            </button>
                        )}
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="profile-section">
                        <h2>Achievements</h2>

                        <div className="stats-container">
                            <div className="stat-card">
                                <div className="stat-value">{profileData.stats.coursesCompleted}</div>
                                <div className="stat-label">Courses Completed</div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-value">{profileData.stats.quizzesTaken}</div>
                                <div className="stat-label">Quizzes Taken</div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-value">{profileData.stats.averageScore}%</div>
                                <div className="stat-label">Average Score</div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-value">{profileData.stats.totalLearningTime}h</div>
                                <div className="stat-label">Learning Time</div>
                            </div>
                        </div>

                        <h3>Certificates & Badges</h3>

                        <div className="achievements-list">
                            {profileData.achievements.map(achievement => (
                                <div key={achievement.id} className="achievement-item">
                                    <div className="achievement-icon">
                                        <i className="fas fa-award"></i>
                                    </div>
                                    <div className="achievement-details">
                                        <h4>{achievement.title}</h4>
                                        <p className="achievement-date">
                                            {new Date(achievement.date).toLocaleDateString()}
                                        </p>
                                        <p className="achievement-description">{achievement.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile; 