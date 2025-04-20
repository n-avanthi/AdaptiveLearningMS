import React, { useState } from 'react';
import axios from '../../services/api';
import './AddContent.css';

const AddContent = ({ onContentAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    level: '',
    type: '',
    content_url: ''
  });

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await axios.post('/content/add-content', formData);
      setSuccessMsg('Content added successfully!');
      onContentAdded(res.data);  // Pass the newly added content to the parent
      setFormData({
        title: '',
        subject: '',
        level: '',
        type: '',
        content_url: ''
      });

      // Auto-hide form after successful submission
      setTimeout(() => {
        setIsFormVisible(false);
        setSuccessMsg('');
      }, 3000);

    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to add content');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsFormVisible(!isFormVisible);
    setSuccessMsg('');
    setErrorMsg('');
  };

  return (
    <div className="add-content-container">
      <div className="add-content-header">
        <h2>Content Management</h2>
        <button
          className={`toggle-form-btn ${isFormVisible ? 'active' : ''}`}
          onClick={toggleForm}
        >
          {isFormVisible ? 'Cancel' : 'Add New Content'}
        </button>
      </div>

      {(successMsg || errorMsg) && (
        <div className={`message-container ${successMsg ? 'success' : 'error'}`}>
          {successMsg || errorMsg}
        </div>
      )}

      {isFormVisible && (
        <div className="content-form-container animate-slide-down">
          <form onSubmit={handleSubmit} className="content-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="Enter content title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  placeholder="E.g. Mathematics, Physics"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="level">Level</label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="type">Content Type</label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Video">Video</option>
                  <option value="Article">Article</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Interactive">Interactive</option>
                </select>
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="content_url">Content URL</label>
              <input
                type="url"
                id="content_url"
                name="content_url"
                placeholder="https://example.com/content"
                value={formData.content_url}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className={`submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="btn-loader"></span>
              ) : (
                'Add Content'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AddContent;
