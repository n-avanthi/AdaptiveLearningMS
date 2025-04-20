from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
from functools import wraps
import requests
from requests.exceptions import Timeout, RequestException
import os
from dotenv import load_dotenv

load_dotenv()
JWT_SECRET = os.getenv("SECRET_KEY", "fallback_secret")

app = Flask(__name__)
# Configure CORS to handle preflight requests properly
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True, "allow_headers": ["Authorization", "Content-Type"]}})

# Microservice endpoints locally
# USER_SERVICE = "http://localhost:5000"
# CONTENT_SERVICE = "http://localhost:5001"
# ADAPTIVE_SERVICE = "http://localhost:5002"
# ANALYTICS_SERVICE = "http://localhost:5003"
# QUIZ_SERVICE = "http://localhost:5004"

# Microservice endpoints for docker
USER_SERVICE = "http://user-service:5000"
CONTENT_SERVICE = "http://content-service:5001"
# ADAPTIVE_SERVICE = "http://adaptive-engine-service:5002"
# ANALYTICS_SERVICE = "http://analytics-service:5003"
QUIZ_SERVICE = "http://quiz-service:5004"


@app.route('/')
def home():
    return jsonify({"message": "This is the API Gateway"})


# JWT token validation with optional role restriction
def token_required(allowed_roles=None):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = None
            if 'Authorization' in request.headers:
                # Inside the token_required decorator in api-gateway
                print("Authorization header:", request.headers.get('Authorization'))
                auth_header = request.headers['Authorization']
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]

            if not token:
                return jsonify({"error": "Token is missing!"}), 401

            try:
                print(f"API Gateway: Decoding token using JWT_SECRET: {JWT_SECRET[:5]}...[truncated]")
                decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
                print(f"API Gateway: Token decoded successfully for user: {decoded.get('username')}, role: {decoded.get('role')}")
                request.user = decoded  # store user info for use inside routes
                if allowed_roles and decoded.get("role") not in allowed_roles:
                    return jsonify({"error": "Access denied: insufficient role"}), 403
            except jwt.ExpiredSignatureError:
                print("API Gateway: Token has expired")
                return jsonify({"error": "Token has expired"}), 401
            except jwt.InvalidTokenError as e:
                print(f"API Gateway: Invalid token: {str(e)}")
                # Log token preview for debugging
                if token:
                    token_preview = token[:10] + "..." if len(token) > 10 else token
                    print(f"API Gateway: Invalid token preview: {token_preview}")
                return jsonify({"error": "Invalid token"}), 401

            return f(*args, **kwargs)
        return decorated
    return decorator


# Forwarding helper function to forward requests to respective services
def forward_request(service_url, path):
    full_url = f"{service_url}/{path}"
    print(f"Forwarding to {full_url}")
    print(f"Method: {request.method}")
    print(f"Headers: {dict(request.headers)}")
    
    if request.is_json:
        print(f"Request JSON data: {request.get_json()}")
    
    # Forward all headers to the service, specifically Authorization
    headers = {}
    for header in request.headers:
        if header[0] not in ['Host', 'Content-Length']:
            headers[header[0]] = header[1]

    try:
        if request.method == 'GET':
            resp = requests.get(full_url, headers=headers, params=request.args, timeout=10)
        elif request.method == 'POST':
            resp = requests.post(full_url, headers=headers, json=request.get_json(), timeout=10)
        elif request.method == 'PUT':
            resp = requests.put(full_url, headers=headers, json=request.get_json(), timeout=10)
        elif request.method == 'DELETE':
            resp = requests.delete(full_url, headers=headers, timeout=10)
        elif request.method == 'OPTIONS':
            return "", 200  # Handle OPTIONS preflight directly
        else:
            return jsonify({"error": f"Unsupported method: {request.method}"}), 405

        print(f"Response status: {resp.status_code}")
        print(f"Response content: {resp.text[:200]}..." if resp.text else "Empty response")
        print(f"Response headers: {dict(resp.headers)}")
        
        # Check for errors
        resp.raise_for_status()
        
        # Return the response based on content type
        content_type = resp.headers.get('Content-Type', '')
        if 'application/json' in content_type and resp.text:
            return jsonify(resp.json()), resp.status_code
        else:
            # Pass through non-JSON responses as-is
            return resp.text, resp.status_code, dict(resp.headers)
            
    except Timeout:
        print("Request timed out")
        return jsonify({"error": "Request timed out"}), 504
    except RequestException as e:
        print(f"Request failed: {str(e)}")
        print(f"Response content (if any): {e.response.text if hasattr(e, 'response') and e.response else 'No response'}")
        return jsonify({"error": f"Request failed: {str(e)}"}), 502
    except Exception as e:
        print(f"Error in forward_request: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ----------- UNAUTHENTICATED ROUTES FOR REGISTER & LOGIN -----------

# These routes should not require authentication, so no token_required decorator
@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS':
        return '', 200  # Respond to the CORS preflight
    return forward_request(USER_SERVICE, 'register')


@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200  # Respond to the CORS preflight
    return forward_request(USER_SERVICE, 'login')


# ------------------- ROUTING TO MICROSERVICES -------------------

# User service routes
@app.route('/users/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
@app.route('/users/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def user_route(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    # Apply token validation after handling OPTIONS
    @token_required(allowed_roles=["student", "teacher", "admin"])
    def protected_route(*args, **kwargs):
        return forward_request(USER_SERVICE, path)
    
    return protected_route()


# Content service routes - handle specific endpoints separately
@app.route('/content/get-content', methods=['GET', 'OPTIONS'])
def content_get():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        return forward_request(CONTENT_SERVICE, 'get-content')
    
    return protected_route()


@app.route('/content/add-content', methods=['POST', 'OPTIONS'])
def content_add():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        return forward_request(CONTENT_SERVICE, 'add-content')
    
    return protected_route()


# Generic content service routes
@app.route('/content/', defaults={'path': ''}, methods=['GET', 'OPTIONS'])
def content_route_get(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        # Default to get-content when path is empty
        actual_path = 'get-content' if not path else path
        return forward_request(CONTENT_SERVICE, actual_path)
    
    return protected_route()


@app.route('/content/', defaults={'path': ''}, methods=['POST', 'OPTIONS'])
def content_route_post(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        # Default to add-content when path is empty
        actual_path = 'add-content' if not path else path
        return forward_request(CONTENT_SERVICE, actual_path)
    
    return protected_route()


@app.route('/content/<path:path>', methods=['GET', 'OPTIONS'])
def content_path_get(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        return forward_request(CONTENT_SERVICE, path)
    
    return protected_route()


@app.route('/content/<path:path>', methods=['POST', 'OPTIONS'])
def content_path_post(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        return forward_request(CONTENT_SERVICE, path)
    
    return protected_route()


# Adaptive service routes
# @app.route('/adaptive/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
# @app.route('/adaptive/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
# def adaptive_route(path):
#     if request.method == 'OPTIONS':
#         return '', 200  # Handle OPTIONS preflight directly
#     
#     @token_required()  # All authenticated users
#     def protected_route(*args, **kwargs):
#         return forward_request(ADAPTIVE_SERVICE, path)
#     
#     return protected_route()


# Analytics service routes
# @app.route('/analytics/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
# @app.route('/analytics/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
# def analytics_route(path):
#     if request.method == 'OPTIONS':
#         return '', 200  # Handle OPTIONS preflight directly
#     
#     @token_required(allowed_roles=["teacher"])
#     def protected_route(*args, **kwargs):
#         return forward_request(ANALYTICS_SERVICE, path)
#     
#     return protected_route()


# Quiz service routes with proper role-based access control
@app.route('/quiz/create-quiz', methods=['POST', 'OPTIONS'])
def create_quiz():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, 'create-quiz')
    
    return protected_route()

@app.route('/quiz/get-quizzes', methods=['GET', 'OPTIONS'])
def get_quizzes():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, 'get-quizzes')
    
    return protected_route()

@app.route('/quiz/quiz/<quiz_id>', methods=['GET', 'OPTIONS'])
def get_quiz(quiz_id):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, f'quiz/{quiz_id}')
    
    return protected_route()

@app.route('/quiz/submit-quiz', methods=['POST', 'OPTIONS'])
def submit_quiz():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["student"])
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, 'submit-quiz')
    
    return protected_route()

@app.route('/quiz/feedback-status/<task_id>', methods=['GET', 'OPTIONS'])
def feedback_status(task_id):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["student"])
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, f'feedback-status/{task_id}')
    
    return protected_route()

@app.route('/quiz/user-results/<username>', methods=['GET', 'OPTIONS'])
def user_quiz_results(username):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher", "student"])
    def protected_route(*args, **kwargs):
        current_user = request.user
        # Students can only view their own results
        if current_user.get("role") == "student" and current_user.get("username") != username:
            return jsonify({"error": "Access denied: you can only view your own results"}), 403
        return forward_request(QUIZ_SERVICE, f'user-results/{username}')
    
    return protected_route()

# Add specific routes for update-quiz and delete-quiz
@app.route('/quiz/update-quiz/<quiz_id>', methods=['PUT', 'OPTIONS'])
def update_quiz(quiz_id):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        print(f"Update quiz: forwarding request with method {request.method}")
        print(f"Update quiz: authorization header: {request.headers.get('Authorization')}")
        return forward_request(QUIZ_SERVICE, f'update-quiz/{quiz_id}')
    
    return protected_route()

@app.route('/quiz/delete-quiz/<quiz_id>', methods=['DELETE', 'OPTIONS'])
def delete_quiz(quiz_id):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required(allowed_roles=["admin", "teacher"])
    def protected_route(*args, **kwargs):
        print(f"Delete quiz: forwarding request with method {request.method}")
        print(f"Delete quiz: authorization header: {request.headers.get('Authorization')}")
        return forward_request(QUIZ_SERVICE, f'delete-quiz/{quiz_id}')
    
    return protected_route()

@app.route('/quiz/clear-quiz-cache', methods=['POST', 'OPTIONS'])
def clear_quiz_cache():
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required()  # Allow any authenticated user to clear their cache
    def protected_route(*args, **kwargs):
        print(f"Clearing quiz cache")
        return forward_request(QUIZ_SERVICE, 'clear-quiz-cache')
    
    return protected_route()

# Generic quiz service routes
@app.route('/quiz/', defaults={'path': ''}, methods=['GET', 'POST', 'OPTIONS'])
@app.route('/quiz/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def quiz_route(path):
    if request.method == 'OPTIONS':
        return '', 200  # Handle OPTIONS preflight directly
    
    @token_required()  # Specific endpoints already have role restrictions
    def protected_route(*args, **kwargs):
        return forward_request(QUIZ_SERVICE, path)
    
    return protected_route()

# Run the gateway
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)