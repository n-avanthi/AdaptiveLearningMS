import React, { useState, useEffect } from "react";
import "./ContentList.css";  // Assuming you'll create a separate CSS file for styling

const ContentList = ({ contentList }) => {
  const [animatedItems, setAnimatedItems] = useState(new Set());

  useEffect(() => {
    // Track which items we've seen to animate only new content
    const currentIds = new Set(contentList.map(content => content._id));
    setAnimatedItems(currentIds);
  }, [contentList]);

  // Helper to get class name based on subject
  const getSubjectClass = (subject) => {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math')) return 'math';
    if (subjectLower.includes('science') || subjectLower.includes('physics') ||
      subjectLower.includes('chemistry') || subjectLower.includes('biology')) return 'science';
    if (subjectLower.includes('english') || subjectLower.includes('language') ||
      subjectLower.includes('literature') || subjectLower.includes('writing')) return 'language';
    if (subjectLower.includes('history') || subjectLower.includes('social')) return 'history';
    return '';
  };

  return (
    <div className="content-list-container">
      <h3 className="content-list-heading">Content Library</h3>
      {contentList.length === 0 ? (
        <p className="no-content-message">No content available yet</p>
      ) : (
        <div className="card-grid">
          {contentList.map((content) => (
            <div
              className={`card ${getSubjectClass(content.subject)} ${animatedItems.has(content._id) ? 'new-content' : ''}`}
              key={content._id}
            >
              <div className="card-header">
                <h4>{content.title}</h4>
                <span className="content-level">{content.level}</span>
              </div>
              <div className="card-body">
                <p><strong>Subject:</strong> {content.subject}</p>
                <p><strong>Type:</strong> {content.type}</p>
              </div>
              <div className="card-footer">
                <a
                  href={content.content_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-content-link"
                >
                  View Content
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentList;
