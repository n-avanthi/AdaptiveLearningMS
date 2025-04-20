import api from './api';

export const quizApi = {
    // Get all quizzes or filter by subject and level
    getQuizzes: (subject = null, level = null) => {
        let url = '/quiz/get-quizzes';
        const params = [];

        if (subject) {
            params.push(`subject=${encodeURIComponent(subject)}`);
        }
        if (level) {
            params.push(`level=${encodeURIComponent(level)}`);
        }

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        return api.get(url);
    },

    // Get a specific quiz by ID
    getQuiz: (quizId) => {
        return api.get(`/quiz/quiz/${quizId}`);
    },

    // Create a new quiz (teacher only)
    createQuiz: (quizData) => {
        return api.post('/quiz/create-quiz', quizData);
    },

    // Update an existing quiz (teacher and admin only)
    updateQuiz: (quizId, quizData) => {
        return api.put(`/quiz/update-quiz/${quizId}`, quizData);
    },

    // Delete a quiz (teacher and admin only)
    deleteQuiz: (quizId) => {
        return api.delete(`/quiz/delete-quiz/${quizId}`);
    },

    // Submit a completed quiz
    submitQuiz: (quizResult) => {
        return api.post('/quiz/submit-quiz', quizResult);
    },

    // Get feedback status
    getFeedbackStatus: (taskId) => {
        return api.get(`/quiz/feedback-status/${taskId}`);
    },

    // Get all quiz results for a user
    getUserResults: (username) => {
        // Extract base username and any query params
        const parts = username.split('?');
        const baseUsername = parts[0];
        const queryParams = parts.length > 1 ? `?${parts[1]}` : '';

        return api.get(`/quiz/user-results/${baseUsername}${queryParams}`);
    },

    // Clear cache (helpful when results aren't showing up)
    clearQuizCache: () => {
        return api.post('/quiz/clear-quiz-cache', {}, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};

export default quizApi; 