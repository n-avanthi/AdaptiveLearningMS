import React, { useState } from "react";
import axios from "../../services/api";

const AnalyticsDashboard = () => {
  const [username, setUsername] = useState("");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [timeTaken, setTimeTaken] = useState("");
  const [taskId, setTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");

  // Submit performance data
  const handleSubmit = async () => {
    try {
      const res = await axios.post("/analytics/submit-performance", {
        username,
        subject,
        score: Number(score),
        time_taken: Number(timeTaken),
      });
      setMessage(res.data.message || "Submitted");
    } catch (err) {
      setMessage("Failed to submit performance data");
    }
  };

  // Trigger insights task
  const handleGenerateInsights = async () => {
    try {
      const res = await axios.get(`/analytics/insights/${username}`);
      setTaskId(res.data.task_id);
      setTaskStatus("Processing...");
      setResult(null);
    } catch (err) {
      setMessage("Failed to generate insights");
    }
  };

  // Poll task status
  const checkTaskStatus = async () => {
    try {
      const res = await axios.get(`/analytics/task-status/${taskId}`);
      setTaskStatus(res.data.status);
      if (res.data.status === "Completed") {
        setResult(res.data.result);
      }
    } catch (err) {
      setTaskStatus("Error checking status");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Analytics Dashboard</h2>

      <div>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <h3>Submit Performance Data</h3>
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <input
        type="number"
        placeholder="Score"
        value={score}
        onChange={(e) => setScore(e.target.value)}
      />
      <input
        type="number"
        placeholder="Time Taken (mins)"
        value={timeTaken}
        onChange={(e) => setTimeTaken(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit</button>

      <h3>Generate Insights</h3>
      <button onClick={handleGenerateInsights}>Start Task</button>
      {taskId && (
        <div>
          <p>Task ID: {taskId}</p>
          <button onClick={checkTaskStatus}>Check Task Status</button>
        </div>
      )}

      {taskStatus && <p>Status: {taskStatus}</p>}

      {result && (
        <div>
          <h4>Insights:</h4>
          <p>Average Score: {result.average_score}</p>
          <p>Total Time Spent: {result.total_time_spent} mins</p>
          <p>Most Attempted Subject: {result.most_attempted_subject}</p>
          <p>Weak Subjects: {result.weak_subjects.join(", ") || "None"}</p>
        </div>
      )}

      {message && <p>{message}</p>}
    </div>
  );
};

export default AnalyticsDashboard;
