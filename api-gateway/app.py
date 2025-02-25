import os
import requests
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import wraps
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Service URLs from environment variables
USER_SERVICE_URL = os.getenv('USER_SERVICE_URL', 'http://user-service:5001')
CONTENT_SERVICE_URL = os.getenv('CONTENT_SERVICE_URL', 'http://content-service:5002')
LEARNING_ENGINE_URL = os.getenv('LEARNING_ENGINE_URL', 'http://learning-engine:5003')
ANALYTICS_SERVICE_URL = os.getenv('ANALYTICS_SERVICE_URL', 'http://analytics-service:5004')
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_jwt_secret_key')

# JWT token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check if token is in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            # Decode the token
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            current_user = data
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)
    
    return decorated

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'api-gateway'})

# User Service Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    return proxy_request(USER_SERVICE_URL, '/api/auth/register')

@app.route('/api/auth/login', methods=['POST'])
def login():
    return proxy_request(USER_SERVICE_URL, '/api/auth/login')

@app.route('/api/users/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    return proxy_request(USER_SERVICE_URL, '/api/users/profile', headers={'X-User-ID': current_user['sub']})

@app.route('/api/users/profile', methods=['PUT'])
@token_required
def update_profile(current_user):
    return proxy_request(USER_SERVICE_URL, '/api/users/profile', headers={'X-User-ID': current_user['sub']})

# Content Service Routes
@app.route('/api/content/lessons', methods=['GET'])
@token_required
def get_lessons(current_user):
    return proxy_request(CONTENT_SERVICE_URL, '/api/content/lessons', headers={'X-User-ID': current_user['sub']})

@app.route('/api/content/lessons/<lesson_id>', methods=['GET'])
@token_required
def get_lesson(current_user, lesson_id):
    return proxy_request(CONTENT_SERVICE_URL, f'/api/content/lessons/{lesson_id}', headers={'X-User-ID': current_user['sub']})

@app.route('/api/content/quizzes/<quiz_id>', methods=['GET'])
@token_required
def get_quiz(current_user, quiz_id):
    return proxy_request(CONTENT_SERVICE_URL, f'/api/content/quizzes/{quiz_id}', headers={'X-User-ID': current_user['sub']})

@app.route('/api/content/quizzes/<quiz_id>/submit', methods=['POST'])
@token_required
def submit_quiz(current_user, quiz_id):
    return proxy_request(CONTENT_SERVICE_URL, f'/api/content/quizzes/{quiz_id}/submit', headers={'X-User-ID': current_user['sub']})

# Learning Engine Routes
@app.route('/api/learning-path/<user_id>', methods=['GET'])
@token_required
def get_learning_path(current_user, user_id):
    # Verify the user is requesting their own data or is a teacher
    if current_user['sub'] != user_id and current_user['role'] != 'teacher':
        return jsonify({'message': 'Unauthorized access!'}), 403
    return proxy_request(LEARNING_ENGINE_URL, f'/api/learning-path/{user_id}')

@app.route('/api/learning-path/<user_id>/update', methods=['POST'])
@token_required
def update_learning_path(current_user, user_id):
    # Verify the user is updating their own data or is a teacher
    if current_user['sub'] != user_id and current_user['role'] != 'teacher':
        return jsonify({'message': 'Unauthorized access!'}), 403
    return proxy_request(LEARNING_ENGINE_URL, f'/api/learning-path/{user_id}/update')

# Analytics Service Routes
@app.route('/api/analytics/students/<student_id>', methods=['GET'])
@token_required
def get_student_analytics(current_user, student_id):
    # Only teachers or the student themselves can access this
    if current_user['sub'] != student_id and current_user['role'] != 'teacher':
        return jsonify({'message': 'Unauthorized access!'}), 403
    return proxy_request(ANALYTICS_SERVICE_URL, f'/api/analytics/students/{student_id}')

@app.route('/api/analytics/teachers/dashboard', methods=['GET'])
@token_required
def get_teacher_dashboard(current_user):
    # Only teachers can access this
    if current_user['role'] != 'teacher':
        return jsonify({'message': 'Unauthorized access!'}), 403
    return proxy_request(ANALYTICS_SERVICE_URL, '/api/analytics/teachers/dashboard')

@app.route('/api/analytics/performance/summary', methods=['GET'])
@token_required
def get_performance_summary(current_user):
    # Only teachers can access this
    if current_user['role'] != 'teacher':
        return jsonify({'message': 'Unauthorized access!'}), 403
    return proxy_request(ANALYTICS_SERVICE_URL, '/api/analytics/performance/summary')

# Helper function to proxy requests to microservices
def proxy_request(service_url, path, headers=None):
    url = f"{service_url}{path}"
    
    # Forward the request method, data, and headers
    method = request.method
    data = request.get_data()
    request_headers = {key: value for key, value in request.headers if key != 'Host'}
    
    # Add custom headers if provided
    if headers:
        request_headers.update(headers)
    
    # Make the request to the microservice
    response = requests.request(
        method=method,
        url=url,
        headers=request_headers,
        data=data,
        params=request.args
    )
    
    # Return the response from the microservice
    return (
        response.content,
        response.status_code,
        response.headers.items()
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000) 