// components/recommendation/Recommendation.jsx

import React, { useState } from "react";
import axios from "axios";
import "./recommendation.css"; // Make sure to import the CSS file

const Recommendation = () => {
  const [recommendation, setRecommendation] = useState(null);
  const [error, setError] = useState(null);
  const [score, setScore] = useState("");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [username, setUsername] = useState("test_user");

  // Function to get recommendation based on user input
  const getRecommendation = async () => {
    if (!score || isNaN(Number(score))) {
        setError("Please enter a valid score");
        return;
      }
    try {
      const response = await axios.post(
        "http://localhost:8000/adaptive/recommend", 
        {
          username,
          score,
          difficulty,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`, // Assuming JWT is saved in localStorage
          },
        }
      );

      if (response.data.next_content) {
        setRecommendation(response.data.next_content);
      } else {
        setError("No content found for this level.");
      }
    } catch (err) {
      setError("Error fetching recommendation.");
      console.error(err);
    }
  };

  return (
    <div className="recommendation-container">
      <h2>Get Content Recommendation</h2>

      <div>
        <label>Score:</label>
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="Enter your score"
        />
      </div>

      <div>
        <label>Difficulty:</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      <button onClick={getRecommendation}>
        Get Recommendation
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {recommendation && (
        <div>
          <h3>Recommended Content:</h3>
          <h4>{recommendation.title}</h4>
          <p>{recommendation.description}</p>
        </div>
      )}
    </div>
  );
};

export default Recommendation;