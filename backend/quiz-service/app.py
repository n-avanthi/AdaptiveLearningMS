from flask import Flask, jsonify, request, session
from flask_cors import CORS
from bson import ObjectId, json_util
from pymongo import MongoClient
import json
import os
from dotenv import load_dotenv
from celery import Celery
import requests
import google.generativeai as genai
import time
import logging
import redis
import pickle
from functools import wraps
import jwt

load_dotenv()

app = Flask(__name__)
# Configure CORS to properly handle preflight requests
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True, "allow_headers": ["Authorization", "Content-Type"]}})

# Set up session config
app.secret_key = os.getenv("SECRET_KEY", "your-secret-key")
app.config['SESSION_TYPE'] = 'redis'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour session lifetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set up MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://mongodb:27017/"))
db = client["adaptive_lms"]
quiz_collection = db["quizzes"]
quiz_results_collection = db["quiz_results"]

# Set up Redis
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))
REDIS_URL = os.getenv("REDIS_URL", f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}")

# Initialize Redis connection
redis_client = redis.Redis.from_url(REDIS_URL)

# Set up Celery
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

# JWT Secret
JWT_SECRET = os.getenv("SECRET_KEY", "your-secret-key")

# Model configuration - directly use gemini-2.0-flash model
GEMINI_MODEL = "gemini-2.0-flash"  # Free tier model
MAX_RETRIES = 3
RETRY_DELAY = 6  # seconds

# Cache TTL values
QUIZ_CACHE_TTL = 3600  # 1 hour cache for quizzes
SESSION_CACHE_TTL = 86400  # 24 hours cache for user sessions

celery = Celery(
    'quiz_tasks',
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

# Helper function to convert MongoDB data to JSON
def parse_json(data):
    return json.loads(json_util.dumps(data))

# Decorator for Redis caching
def cache_with_redis(prefix, ttl=QUIZ_CACHE_TTL):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Create a cache key based on the function name and arguments
            cache_key = f"{prefix}:{f.__name__}:"
            for arg in args:
                if isinstance(arg, (str, int, float, bool)):
                    cache_key += f"{arg}:"
            
            for key, value in kwargs.items():
                if isinstance(value, (str, int, float, bool)):
                    cache_key += f"{key}:{value}:"
            
            # Check if we have a cached response
            cached_response = redis_client.get(cache_key)
            if cached_response:
                logger.info(f"Cache hit for {cache_key}")
                return pickle.loads(cached_response)
            
            # If not cached, call the original function
            response = f(*args, **kwargs)
            
            # Cache the response
            redis_client.setex(cache_key, ttl, pickle.dumps(response))
            logger.info(f"Cached response for {cache_key}")
            
            return response
        return decorated_function
    return decorator

# Set up user session storage in Redis
def get_user_session(user_id):
    session_key = f"user_session:{user_id}"
    user_data = redis_client.get(session_key)
    if user_data:
        return pickle.loads(user_data)
    return None

def set_user_session(user_id, user_data):
    session_key = f"user_session:{user_id}"
    redis_client.setex(session_key, SESSION_CACHE_TTL, pickle.dumps(user_data))
    return True

def clear_user_session(user_id):
    session_key = f"user_session:{user_id}"
    redis_client.delete(session_key)
    return True

# JWT token validation function
def get_user_from_token():
    """
    Extract and validate JWT token from Authorization header
    Returns user data or None if invalid/missing
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        logger.warning("No Bearer token found in Authorization header")
        return None
    
    token = auth_header.split(" ")[1]
    try:
        logger.info(f"Decoding token using JWT_SECRET: {JWT_SECRET[:5]}...[truncated]")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        logger.info(f"Token decoded successfully for user: {payload.get('username')}")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {str(e)}")
        # Log the token (first few chars only for security)
        if token:
            token_preview = token[:10] + "..." if len(token) > 10 else token
            logger.warning(f"Invalid token preview: {token_preview}")
        return None

# Role-based authentication decorator
def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # First try from session
            user_id = session.get('user_id')
            user_data = None
            
            if user_id:
                user_data = get_user_session(user_id)
                logger.info(f"Found user in session: {user_data.get('username') if user_data else None}")
            
            # If not in session, try from JWT token
            if not user_data:
                user_data = get_user_from_token()
                logger.info(f"Found user from token: {user_data.get('username') if user_data else None}")
            
            # Check if user has the required role
            if not user_data:
                return jsonify({"error": "Authentication required"}), 401
                
            if user_data.get('role') not in allowed_roles:
                logger.warning(f"Unauthorized access attempt: user {user_data.get('username')} with role {user_data.get('role')} tried to access a resource requiring {allowed_roles}")
                return jsonify({"error": f"Access denied. Required roles: {allowed_roles}"}), 403
                
            # Store user data for use in the view function
            request.user_data = user_data
            return f(*args, **kwargs)
        return decorated_function
    return decorator

@app.route('/')
def home():
    return jsonify({"message": "Quiz Service is running"})

# User session management routes
@app.route('/user-session', methods=['POST'])
def create_user_session():
    data = request.json
    if not data or 'userId' not in data or 'username' not in data:
        return jsonify({"error": "Missing user data"}), 400
    
    user_id = data['userId']
    
    # Set user session data in Redis
    set_user_session(user_id, data)
    
    # Also store in Flask session
    session['user_id'] = user_id
    session['username'] = data['username']
    
    return jsonify({"success": True, "message": "User session created"}), 201

@app.route('/user-session/<user_id>', methods=['GET'])
def get_session(user_id):
    user_data = get_user_session(user_id)
    if user_data:
        return jsonify(user_data), 200
    return jsonify({"error": "User session not found"}), 404

@app.route('/user-session/<user_id>', methods=['DELETE'])
def delete_session(user_id):
    clear_user_session(user_id)
    if 'user_id' in session:
        session.pop('user_id')
    if 'username' in session:
        session.pop('username')
    return jsonify({"success": True, "message": "User session cleared"}), 200

# Create a new quiz
@app.route('/create-quiz', methods=['POST'])
@app.route('/quiz/create-quiz', methods=['POST'])  # Add an alias route to match API gateway forwarding
@role_required(allowed_roles=['teacher', 'admin'])
def create_quiz():
    # User role already validated by decorator
    user_data = request.user_data
    logger.info(f"Create quiz: Authorized request from {user_data.get('username')} with role {user_data.get('role')}")
    
    data = request.json
    logger.info(f"Create quiz: Received request with data keys: {list(data.keys()) if data else None}")
    
    # Validate required fields
    required_fields = ["title", "subject", "level", "questions"]
    if not all(field in data for field in required_fields):
        missing = [field for field in required_fields if field not in data]
        logger.error(f"Create quiz: Missing required fields: {missing}")
        return jsonify({"error": f"Missing required fields: {missing}"}), 400
    
    # Validate questions structure
    questions = data.get("questions", [])
    if not isinstance(questions, list) or not questions:
        logger.error(f"Create quiz: Invalid questions format")
        return jsonify({"error": "Questions must be a non-empty list"}), 400
    
    for i, question in enumerate(questions):
        if not all(key in question for key in ["question", "choices", "correctAnswer"]):
            missing_keys = [key for key in ["question", "choices", "correctAnswer"] if key not in question]
            logger.error(f"Create quiz: Question at index {i} is missing fields: {missing_keys}")
            return jsonify({"error": f"Question at index {i} is missing required fields: {missing_keys}"}), 400
        
        # Ensure choices is a list with at least 2 options
        if not isinstance(question["choices"], list) or len(question["choices"]) < 2:
            logger.error(f"Create quiz: Question at index {i} has invalid choices")
            return jsonify({"error": f"Question at index {i} must have at least 2 choices"}), 400
            
        # Ensure correctAnswer is within the range of choices
        if question["correctAnswer"] >= len(question["choices"]) or question["correctAnswer"] < 0:
            logger.error(f"Create quiz: Question at index {i} has invalid correctAnswer: {question['correctAnswer']}")
            return jsonify({"error": f"Question at index {i} has invalid correctAnswer: must be between 0 and {len(question['choices'])-1}"}), 400
    
    # Add creation timestamp and user info
    data["createdAt"] = json_util.datetime.datetime.now()
    data["createdBy"] = user_data.get('username')
    
    try:
        result = quiz_collection.insert_one(data)
        created_quiz = data.copy()
        created_quiz["_id"] = str(result.inserted_id)
        logger.info(f"Create quiz: Successfully created quiz with ID {result.inserted_id}")
        
        # Clear any cached quiz listings that might now be stale
        cache_keys = redis_client.keys("quiz_listing:*")
        if cache_keys:
            redis_client.delete(*cache_keys)
            logger.info(f"Cleared {len(cache_keys)} cached quiz listings after new quiz creation")
        
        return jsonify(created_quiz), 201
    except Exception as e:
        logger.error(f"Create quiz: Error creating quiz: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Get all quizzes or filter by subject and level - Now with Redis caching
@app.route('/get-quizzes', methods=['GET'])
@app.route('/quiz/get-quizzes', methods=['GET'])
@cache_with_redis(prefix="quiz_listing", ttl=QUIZ_CACHE_TTL)
def get_quizzes():
    subject = request.args.get("subject")
    level = request.args.get("level")
    
    query = {}
    
    if subject:
        query["subject"] = subject
    if level:
        query["level"] = level
    
    try:
        logger.info(f"Fetching quizzes from database with query: {query}")
        quiz_list = list(quiz_collection.find(query))
        
        # Convert ObjectId to string for JSON serialization
        for quiz in quiz_list:
            quiz["_id"] = str(quiz["_id"])
        
        return jsonify(quiz_list) if quiz_list else jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Get a specific quiz by ID - Now with Redis caching
@app.route('/quiz/<quiz_id>', methods=['GET'])
@app.route('/quiz/quiz/<quiz_id>', methods=['GET'])
@cache_with_redis(prefix="quiz_detail", ttl=QUIZ_CACHE_TTL)
def get_quiz(quiz_id):
    try:
        # Check if quiz is in cache
        cache_key = f"quiz:{quiz_id}"
        cached_quiz = redis_client.get(cache_key)
        
        if cached_quiz:
            logger.info(f"Cache hit for quiz {quiz_id}")
            return jsonify(pickle.loads(cached_quiz)), 200
        
        logger.info(f"Cache miss for quiz {quiz_id}, fetching from database")
        quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
        
        if quiz:
            quiz["_id"] = str(quiz["_id"])
            # Cache the quiz
            redis_client.setex(cache_key, QUIZ_CACHE_TTL, pickle.dumps(quiz))
            return jsonify(quiz), 200
        else:
            return jsonify({"error": "Quiz not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Submit quiz results and get AI feedback
@app.route('/submit-quiz', methods=['POST'])
@app.route('/quiz/submit-quiz', methods=['POST'])
def submit_quiz_result():
    data = request.json
    
    # Validate required fields
    required_fields = ["quizId", "userId", "username", "answers"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400
    
    quiz_id = data["quizId"]
    user_id = data["userId"]
    username = data["username"]
    answers = data["answers"]
    
    try:
        logger.info(f"Processing quiz submission from user {username} for quiz {quiz_id}")
        
        # Get the quiz from cache first, then database if not found
        cache_key = f"quiz:{quiz_id}"
        cached_quiz = redis_client.get(cache_key)
        
        if cached_quiz:
            quiz = pickle.loads(cached_quiz)
            logger.info(f"Using cached quiz {quiz_id} for result submission")
        else:
            logger.info(f"No cached quiz found, fetching from database: {quiz_id}")
            quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
            if not quiz:
                logger.error(f"Quiz not found: {quiz_id}")
                return jsonify({"error": "Quiz not found"}), 404
            
        # Calculate score
        correct_count = 0
        total_questions = len(quiz["questions"])
        wrong_questions = []
        
        for i, question_data in enumerate(quiz["questions"]):
            # Check if the answer for this question was provided
            if i < len(answers):
                user_answer = answers[i]
                if user_answer == question_data["correctAnswer"]:
                    correct_count += 1
                else:
                    # Save information about wrong answers for feedback
                    wrong_questions.append({
                        "question": question_data["question"],
                        "userAnswer": user_answer,
                        "correctAnswer": question_data["correctAnswer"],
                        "choices": question_data["choices"]
                    })
        
        # Calculate percentage score
        score = (correct_count / total_questions) * 100 if total_questions > 0 else 0
        logger.info(f"User {username} scored {score}% on quiz {quiz_id}")
        
        # Save quiz result
        result_data = {
            "quizId": quiz_id,
            "userId": user_id,
            "username": username,
            "answers": answers,
            "score": score,
            "correctCount": correct_count,
            "totalQuestions": total_questions,
            "wrongQuestions": wrong_questions,
            "completedAt": json_util.datetime.datetime.now()
        }
        
        # Log result data before inserting
        logger.info(f"Saving quiz result: {username}, quiz: {quiz_id}, score: {score}%, correct: {correct_count}/{total_questions}")
        
        result = quiz_results_collection.insert_one(result_data)
        result_id = str(result.inserted_id)
        logger.info(f"Saved quiz result with ID: {result_id}")
        
        # Verify the result was properly saved
        verification = quiz_results_collection.find_one({"_id": ObjectId(result_id)})
        if verification:
            logger.info(f"Verified quiz result was saved successfully")
        else:
            logger.warning(f"Could not verify quiz result was saved successfully")
        
        # Start async task to get AI feedback if there are wrong answers
        if wrong_questions:
            logger.info(f"User {username} got {len(wrong_questions)} questions wrong. Generating AI feedback.")
            task = generate_ai_feedback.delay(quiz_id, username, wrong_questions, quiz["subject"], quiz["level"], result_id)
            result_data["feedbackTaskId"] = task.id
            logger.info(f"Started AI feedback task with ID: {task.id}")
            
            # Update the result with the task ID
            quiz_results_collection.update_one(
                {"_id": ObjectId(result_id)},
                {"$set": {"feedbackTaskId": task.id}}
            )
        
        result_data["_id"] = result_id
        
        # Clear quiz results cache for this user
        user_results_cache_keys = redis_client.keys(f"user_results:get_user_results:{username}:*")
        if user_results_cache_keys:
            redis_client.delete(*user_results_cache_keys)
            logger.info(f"Cleared user results cache for {username}")
        
        # Update user session with latest quiz result
        user_session = get_user_session(user_id)
        if user_session:
            if "recent_quizzes" not in user_session:
                user_session["recent_quizzes"] = []
            
            # Add this quiz to recent quizzes (limit to last 5)
            quiz_summary = {
                "quizId": quiz_id,
                "title": quiz["title"],
                "subject": quiz["subject"],
                "score": score,
                "completedAt": str(result_data["completedAt"])
            }
            
            user_session["recent_quizzes"].insert(0, quiz_summary)
            user_session["recent_quizzes"] = user_session["recent_quizzes"][:5]  # Keep only most recent 5
            set_user_session(user_id, user_session)
        
        logger.info(f"Successfully completed quiz submission for {username}")
        return jsonify(result_data), 201
        
    except Exception as e:
        logger.error(f"Error in submit_quiz_result: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Get feedback status
@app.route('/feedback-status/<task_id>', methods=['GET'])
@app.route('/quiz/feedback-status/<task_id>', methods=['GET'])
def get_feedback_status(task_id):
    try:
        # Check cache first
        cache_key = f"feedback:{task_id}"
        cached_feedback = redis_client.get(cache_key)
        
        if cached_feedback:
            feedback_data = pickle.loads(cached_feedback)
            logger.info(f"Retrieved feedback from cache for task {task_id}")
            return jsonify(feedback_data)
        
        # Get the Celery task result
        task = celery.AsyncResult(task_id)
        logger.info(f"Checking feedback status for task {task_id}, state: {task.state}")
        
        if task.state == 'SUCCESS' or task.state == 'FAILURE':
            # Try to get the result from Celery first
            try:
                feedback = task.result
                logger.info(f"Got feedback from Celery task: {feedback[:50]}...")
                
                feedback_data = {
                    "status": "completed",
                    "feedback": feedback
                }
                
                # Cache the feedback
                redis_client.setex(cache_key, QUIZ_CACHE_TTL, pickle.dumps(feedback_data))
                
                return jsonify(feedback_data)
            except Exception as e:
                logger.error(f"Error getting result from Celery: {str(e)}")
                
                # If failed to get result from Celery, try to find it in the database
                try:
                    # Look up the result in the database based on the task ID
                    quiz_result = quiz_results_collection.find_one({"feedbackTaskId": task_id})
                    if quiz_result and "aiFeedback" in quiz_result:
                        logger.info(f"Found feedback in database: {quiz_result['aiFeedback'][:50]}...")
                        
                        feedback_data = {
                            "status": "completed",
                            "feedback": quiz_result["aiFeedback"]
                        }
                        
                        # Cache the feedback
                        redis_client.setex(cache_key, QUIZ_CACHE_TTL, pickle.dumps(feedback_data))
                        
                        return jsonify(feedback_data)
                except Exception as db_error:
                    logger.error(f"Error getting result from database: {str(db_error)}")
                
                # If all else fails, return an error message
                return jsonify({
                    "status": "completed",
                    "feedback": "Error retrieving AI feedback. Please try again later."
                })
        else:
            logger.info(f"Task {task_id} still processing, state: {task.state}")
            return jsonify({
                "status": "processing",
                "state": task.state
            })
    except Exception as e:
        logger.error(f"Error checking feedback status: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

# Get all quiz results for a specific user
@app.route('/user-results/<username>', methods=['GET'])
@app.route('/quiz/user-results/<username>', methods=['GET'])
@cache_with_redis(prefix="user_results", ttl=QUIZ_CACHE_TTL)
def get_user_results(username):
    try:
        # Check if there's a timestamp parameter to bypass cache
        bypass_cache = 't' in request.args
        logger.info(f"Getting quiz results for user: {username} (bypass_cache: {bypass_cache})")
        
        # If bypass_cache is true, clear user's results cache
        if bypass_cache:
            cache_keys = redis_client.keys(f"user_results:get_user_results:{username}:*")
            if cache_keys:
                redis_client.delete(*cache_keys)
                logger.info(f"Cleared {len(cache_keys)} cache keys for user {username}")
        
        # Check if results exist in the database
        count = quiz_results_collection.count_documents({"username": username})
        logger.info(f"Found {count} results in database for user {username}")
        
        results = list(quiz_results_collection.find({"username": username}))
        logger.info(f"Retrieved {len(results)} results for user {username}")
        
        # Add logging to check if feedback is present
        for result in results:
            result["_id"] = str(result["_id"])
            logger.info(f"Processing result {result['_id']} for quiz {result.get('quizId', 'unknown')}")
            
            if "aiFeedback" in result:
                logger.info(f"Found aiFeedback in result {result['_id']}: {result['aiFeedback'][:50]}...")
            else:
                logger.info(f"No aiFeedback found in result {result['_id']}")

            # Check if there's a feedbackTaskId but no aiFeedback
            if "feedbackTaskId" in result and not "aiFeedback" in result:
                logger.info(f"Result {result['_id']} has a feedbackTaskId but no aiFeedback. Checking task status.")
                try:
                    task = celery.AsyncResult(result["feedbackTaskId"])
                    logger.info(f"Task status: {task.state}")
                    if task.ready():
                        feedback = task.result
                        logger.info(f"Found ready feedback from task: {feedback[:50]}...")
                        result["aiFeedback"] = feedback
                        
                        # Also update the database
                        quiz_results_collection.update_one(
                            {"_id": ObjectId(result["_id"])},
                            {"$set": {"aiFeedback": feedback}}
                        )
                except Exception as e:
                    logger.error(f"Error checking task status: {str(e)}")
        
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Error fetching user results: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Clear quiz cache - useful for admin operations
@app.route('/clear-quiz-cache', methods=['POST'])
def clear_quiz_cache():
    try:
        logger.info("Clearing quiz cache...")
        # Clear all quiz-related cache keys
        quiz_keys = redis_client.keys("quiz:*")
        listing_keys = redis_client.keys("quiz_listing:*")
        detail_keys = redis_client.keys("quiz_detail:*")
        user_results_keys = redis_client.keys("user_results:*")
        feedback_keys = redis_client.keys("feedback:*")
        
        total_keys = len(quiz_keys) + len(listing_keys) + len(detail_keys) + len(user_results_keys) + len(feedback_keys)
        logger.info(f"Found {total_keys} cache keys to clear")
        
        # Delete the keys in batches if they exist
        deleted_count = 0
        
        if quiz_keys:
            redis_client.delete(*quiz_keys)
            deleted_count += len(quiz_keys)
            logger.info(f"Cleared {len(quiz_keys)} quiz keys")
            
        if listing_keys:
            redis_client.delete(*listing_keys)
            deleted_count += len(listing_keys)
            logger.info(f"Cleared {len(listing_keys)} quiz listing keys")
            
        if detail_keys:
            redis_client.delete(*detail_keys)
            deleted_count += len(detail_keys)
            logger.info(f"Cleared {len(detail_keys)} quiz detail keys")
            
        if user_results_keys:
            redis_client.delete(*user_results_keys)
            deleted_count += len(user_results_keys)
            logger.info(f"Cleared {len(user_results_keys)} user results keys")
            
        if feedback_keys:
            redis_client.delete(*feedback_keys)
            deleted_count += len(feedback_keys)
            logger.info(f"Cleared {len(feedback_keys)} feedback keys")
        
        logger.info("Cache clearing completed successfully")
        return jsonify({
            "success": True,
            "message": f"Cleared {deleted_count} cached items"
        })
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Celery task for AI feedback generation using Gemini
@celery.task(name="generate_ai_feedback")
def generate_ai_feedback(quiz_id, username, wrong_questions, subject, level, result_id=None):
    try:
        # Prepare prompt for Gemini
        prompt = f"""
        Imagine you are a tutor. The student {username} took a quiz on {subject} at {level} level and got some questions wrong.
        
        Here are the questions they answered incorrectly:
        
        """
        
        for i, q in enumerate(wrong_questions):
            correct_choice = q["choices"][q["correctAnswer"]]
            user_choice = q["choices"][q["userAnswer"]] if 0 <= q["userAnswer"] < len(q["choices"]) else "No answer"
            
            prompt += f"""
            Question {i+1}: {q["question"]}
            Options: {", ".join(q["choices"])}
            Student's answer: {user_choice}
            Correct answer: {correct_choice}
            """
        
        prompt += """
        
        Please provide:
        1. Concise and short feedback on where the student went wrong for each question
        2. Concepts they need to review based on their mistakes
        3. Three sample practice questions to help them improve in the areas they struggled with

        Address the student as "you" in the feedback. Do not use "The student" or "The user".
        """
        
        # Call Gemini API for feedback generation with retry logic
        retry_count = 0
        feedback = None
        
        while retry_count < MAX_RETRIES and feedback is None:
            try:
                logger.info(f"Attempting to generate feedback using Gemini Flash model (attempt {retry_count+1})")
                
                # Initialize Gemini model
                model = genai.GenerativeModel(GEMINI_MODEL)
                
                # Set safety settings to be more permissive for educational content
                safety_settings = [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_ONLY_HIGH"
                    }
                ]
                
                # Set generation config optimized for flash model
                generation_config = {
                    "temperature": 0.5,  # Lower temperature for more focused responses
                    "top_p": 0.95,
                    "top_k": 32,
                    "max_output_tokens": 800,  # Token limit for flash model
                }
                
                # Generate response with safety settings and generation config
                response = model.generate_content(
                    prompt,
                    safety_settings=safety_settings,
                    generation_config=generation_config
                )
                
                # Extract text from response
                feedback = response.text
                
                # Store feedback in the database
                if result_id:
                    quiz_results_collection.update_one(
                        {"_id": ObjectId(result_id)},
                        {"$set": {"aiFeedback": feedback}}
                    )
                else:
                    quiz_results_collection.update_one(
                        {"quizId": quiz_id, "username": username},
                        {"$set": {"aiFeedback": feedback}}
                    )
                
                # Cache the feedback
                cache_key = f"feedback:{result_id}"
                redis_client.setex(cache_key, QUIZ_CACHE_TTL, pickle.dumps({
                    "status": "completed",
                    "feedback": feedback
                }))
                
                logger.info("Successfully generated feedback using Gemini Flash model")
                return feedback
                
            except Exception as api_error:
                retry_count += 1
                error_message = str(api_error)
                logger.error(f"Gemini API error: {error_message}")
                
                # Handle rate limiting errors specifically
                if "quota" in error_message.lower() or "rate" in error_message.lower() or "limit" in error_message.lower():
                    logger.warning(f"Rate limit reached. Waiting {RETRY_DELAY * retry_count} seconds before retry.")
                    time.sleep(RETRY_DELAY * retry_count)  # Exponential backoff
                elif retry_count < MAX_RETRIES:
                    logger.warning(f"Retrying in {RETRY_DELAY} seconds...")
                    time.sleep(RETRY_DELAY)
                else:
                    # If we've exhausted retries, create a fallback response
                    feedback = create_fallback_feedback(wrong_questions)
                    
                    # Store fallback feedback
                    if result_id:
                        quiz_results_collection.update_one(
                            {"_id": ObjectId(result_id)},
                            {"$set": {"aiFeedback": feedback}}
                        )
                    else:
                        quiz_results_collection.update_one(
                            {"quizId": quiz_id, "username": username},
                            {"$set": {"aiFeedback": feedback}}
                        )
                    
                    # Cache the feedback
                    cache_key = f"feedback:{result_id}"
                    redis_client.setex(cache_key, QUIZ_CACHE_TTL, pickle.dumps({
                        "status": "completed",
                        "feedback": feedback
                    }))
                    
                    logger.info("Used fallback feedback generation")
                    return feedback
        
        # This will only execute if the loop exits without returning
        if not feedback:
            feedback = f"Error generating feedback from Gemini API after {MAX_RETRIES} attempts. Please try again later."
        
        return feedback
    
    except Exception as e:
        logger.error(f"Error in generate_ai_feedback task: {str(e)}")
        return f"Error generating feedback: {str(e)}"

def create_fallback_feedback(wrong_questions):
    """Create basic feedback without using AI when API calls fail"""
    feedback = "Feedback on your quiz results:\n\n"
    
    for i, q in enumerate(wrong_questions):
        correct_choice = q["choices"][q["correctAnswer"]]
        user_choice = q["choices"][q["userAnswer"]] if 0 <= q["userAnswer"] < len(q["choices"]) else "No answer"
        
        feedback += f"Question {i+1}: {q['question']}\n"
        feedback += f"Your answer: {user_choice}\n"
        feedback += f"Correct answer: {correct_choice}\n"
        feedback += "Review this concept for a better understanding.\n\n"
    
    feedback += "\nGeneral study recommendations:\n"
    feedback += "1. Review your class notes on these topics\n"
    feedback += "2. Practice more questions in the areas where you made mistakes\n"
    feedback += "3. Consider asking your teacher for additional resources\n"
    
    return feedback

# Check Redis connection status
@app.route('/redis-status', methods=['GET'])
def check_redis_status():
    try:
        redis_info = redis_client.info()
        return jsonify({
            "status": "connected",
            "redis_version": redis_info.get("redis_version", "unknown"),
            "uptime_days": redis_info.get("uptime_in_days", 0)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

# Generic OPTIONS handler for any route
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return '', 200

# Update a quiz (teacher and admin only)
@app.route('/update-quiz/<quiz_id>', methods=['PUT'])
@app.route('/quiz/update-quiz/<quiz_id>', methods=['PUT'])
@role_required(allowed_roles=['teacher', 'admin'])
def update_quiz(quiz_id):
    # User role already validated by the decorator
    user_data = request.user_data
    logger.info(f"Update quiz request for quiz {quiz_id} from {user_data.get('username')}")
    
    try:
        # Check if quiz exists
        quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            logger.warning(f"Quiz {quiz_id} not found for update")
            return jsonify({"error": "Quiz not found"}), 404
        
        # Check if the user has permission to update this quiz
        # Only the creator or an admin can update
        if user_data.get('role') != 'admin' and quiz.get('createdBy') != user_data.get('username'):
            logger.warning(f"Unauthorized update attempt by {user_data.get('username')} for quiz created by {quiz.get('createdBy')}")
            return jsonify({"error": "You can only update quizzes that you created"}), 403
        
        # Get the updated data
        data = request.json
        
        # Validate data similar to create_quiz
        required_fields = ["title", "subject", "level", "questions"]
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return jsonify({"error": f"Missing required fields: {missing}"}), 400
        
        # Keep original creator and creation time
        data['createdBy'] = quiz.get('createdBy')
        data['createdAt'] = quiz.get('createdAt')
        
        # Add update timestamp
        data['updatedAt'] = json_util.datetime.datetime.now()
        data['updatedBy'] = user_data.get('username')
        
        # Update the quiz
        quiz_collection.update_one({"_id": ObjectId(quiz_id)}, {"$set": data})
        
        # Clear cache for this quiz
        cache_keys = [
            f"quiz:{quiz_id}",
            f"quiz_detail:get_quiz:{quiz_id}:"
        ]
        
        # Also clear any quiz listings
        listing_keys = redis_client.keys("quiz_listing:*")
        if listing_keys:
            cache_keys.extend(listing_keys)
        
        if cache_keys:
            redis_client.delete(*cache_keys)
            logger.info(f"Cleared cache for updated quiz {quiz_id}")
        
        updated_quiz = data.copy()
        updated_quiz["_id"] = quiz_id
        
        return jsonify(updated_quiz), 200
    except Exception as e:
        logger.error(f"Error updating quiz: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Delete a quiz (teacher and admin only)
@app.route('/delete-quiz/<quiz_id>', methods=['DELETE'])
@app.route('/quiz/delete-quiz/<quiz_id>', methods=['DELETE'])
@role_required(allowed_roles=['teacher', 'admin'])
def delete_quiz(quiz_id):
    # User role already validated by decorator
    user_data = request.user_data
    logger.info(f"Delete quiz {quiz_id}: Authorized request from {user_data.get('username')} with role {user_data.get('role')}")
    
    try:
        # First check if the quiz exists
        quiz = quiz_collection.find_one({"_id": ObjectId(quiz_id)})
        if not quiz:
            logger.warning(f"Delete quiz {quiz_id}: Quiz not found")
            return jsonify({"error": "Quiz not found"}), 404
        
        # Delete the quiz
        result = quiz_collection.delete_one({"_id": ObjectId(quiz_id)})
        
        if result.deleted_count == 0:
            logger.error(f"Delete quiz {quiz_id}: Failed to delete")
            return jsonify({"error": "Failed to delete quiz"}), 500
        
        logger.info(f"Delete quiz {quiz_id}: Successfully deleted quiz")
        
        # Clear cache for this quiz and any quiz listings
        cache_keys = [
            f"quiz:{quiz_id}",
            f"quiz_detail:get_quiz:{quiz_id}:"
        ]
        
        # Also clear any quiz listings
        listing_keys = redis_client.keys("quiz_listing:*")
        if listing_keys:
            cache_keys.extend(listing_keys)
        
        if cache_keys:
            redis_client.delete(*cache_keys)
            logger.info(f"Cleared cache for deleted quiz {quiz_id}")
        
        # Also delete any quiz results associated with this quiz
        quiz_results_collection.delete_many({"quizId": quiz_id})
        
        return jsonify({
            "success": True,
            "message": "Quiz and associated results successfully deleted"
        }), 200
    except Exception as e:
        logger.error(f"Delete quiz {quiz_id}: Error deleting quiz: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004, debug=True) 