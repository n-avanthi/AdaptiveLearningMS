import os
import json
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps, loads
import redis
from dotenv import load_dotenv
from marshmallow import Schema, fields, validate, ValidationError

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/adaptive_learning')
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client.get_database()
lessons_collection = db.lessons
quizzes_collection = db.quizzes
user_progress_collection = db.user_progress

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/1')
redis_client = redis.from_url(REDIS_URL)

# Learning Engine Service URL
LEARNING_ENGINE_URL = os.getenv('LEARNING_ENGINE_URL', 'http://learning-engine:5003')

# Validation schemas
class QuizSubmissionSchema(Schema):
    answers = fields.Dict(keys=fields.String(), values=fields.String(), required=True)
    time_spent = fields.Integer(required=True)  # Time spent in seconds

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'content-service'})

# Get all lessons endpoint
@app.route('/api/content/lessons', methods=['GET'])
def get_lessons():
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Get learning path for the user from Learning Engine
        try:
            response = requests.get(f"{LEARNING_ENGINE_URL}/api/learning-path/{user_id}")
            if response.status_code == 200:
                learning_path = response.json().get('learning_path', {})
                recommended_lessons = learning_path.get('recommended_lessons', [])
            else:
                recommended_lessons = []
        except:
            recommended_lessons = []
        
        # Try to get lessons from Redis cache
        cached_lessons = redis_client.get('lessons')
        if cached_lessons:
            lessons = json.loads(cached_lessons)
        else:
            # If not in cache, get from database
            cursor = lessons_collection.find({})
            lessons = loads(dumps(cursor))
            
            # Cache lessons in Redis (1 hour expiry)
            redis_client.setex('lessons', 3600, dumps(lessons))
        
        # Add recommendation flag to lessons
        for lesson in lessons:
            lesson['recommended'] = str(lesson['_id']) in recommended_lessons
        
        return jsonify({'lessons': lessons}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get specific lesson endpoint
@app.route('/api/content/lessons/<lesson_id>', methods=['GET'])
def get_lesson(lesson_id):
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Try to get lesson from Redis cache
        cached_lesson = redis_client.get(f"lesson:{lesson_id}")
        if cached_lesson:
            lesson = json.loads(cached_lesson)
        else:
            # If not in cache, get from database
            lesson = lessons_collection.find_one({'_id': ObjectId(lesson_id)})
            if not lesson:
                return jsonify({'message': 'Lesson not found'}), 404
            
            # Convert ObjectId to string for JSON serialization
            lesson = loads(dumps(lesson))
            
            # Cache lesson in Redis (1 hour expiry)
            redis_client.setex(f"lesson:{lesson_id}", 3600, dumps(lesson))
        
        # Record user progress
        user_progress = {
            'user_id': user_id,
            'content_id': lesson_id,
            'content_type': 'lesson',
            'status': 'viewed',
            'timestamp': datetime.datetime.utcnow()
        }
        user_progress_collection.insert_one(user_progress)
        
        # Notify Learning Engine about the progress
        try:
            requests.post(
                f"{LEARNING_ENGINE_URL}/api/learning-path/{user_id}/update",
                json={
                    'content_id': lesson_id,
                    'content_type': 'lesson',
                    'action': 'viewed'
                }
            )
        except:
            # Log error but continue
            pass
        
        return jsonify({'lesson': lesson}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get quiz endpoint
@app.route('/api/content/quizzes/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Try to get quiz from Redis cache
        cached_quiz = redis_client.get(f"quiz:{quiz_id}")
        if cached_quiz:
            quiz = json.loads(cached_quiz)
        else:
            # If not in cache, get from database
            quiz = quizzes_collection.find_one({'_id': ObjectId(quiz_id)})
            if not quiz:
                return jsonify({'message': 'Quiz not found'}), 404
            
            # Convert ObjectId to string for JSON serialization
            quiz = loads(dumps(quiz))
            
            # Cache quiz in Redis (1 hour expiry)
            redis_client.setex(f"quiz:{quiz_id}", 3600, dumps(quiz))
        
        # Remove answers from quiz before sending to client
        if 'questions' in quiz:
            for question in quiz['questions']:
                if 'correct_answer' in question:
                    del question['correct_answer']
        
        # Record user progress
        user_progress = {
            'user_id': user_id,
            'content_id': quiz_id,
            'content_type': 'quiz',
            'status': 'started',
            'timestamp': datetime.datetime.utcnow()
        }
        user_progress_collection.insert_one(user_progress)
        
        return jsonify({'quiz': quiz}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Submit quiz answers endpoint
@app.route('/api/content/quizzes/<quiz_id>/submit', methods=['POST'])
def submit_quiz(quiz_id):
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Validate request data
        schema = QuizSubmissionSchema()
        data = schema.load(request.json)
        
        # Get quiz from database
        quiz = quizzes_collection.find_one({'_id': ObjectId(quiz_id)})
        if not quiz:
            return jsonify({'message': 'Quiz not found'}), 404
        
        # Calculate score
        total_questions = len(quiz['questions'])
        correct_answers = 0
        question_results = []
        
        for question in quiz['questions']:
            question_id = str(question['_id'])
            user_answer = data['answers'].get(question_id)
            
            is_correct = False
            if user_answer and user_answer == question['correct_answer']:
                correct_answers += 1
                is_correct = True
            
            question_results.append({
                'question_id': question_id,
                'is_correct': is_correct,
                'user_answer': user_answer,
                'correct_answer': question['correct_answer']
            })
        
        score = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
        
        # Record quiz result
        quiz_result = {
            'user_id': user_id,
            'quiz_id': quiz_id,
            'score': score,
            'time_spent': data['time_spent'],
            'question_results': question_results,
            'timestamp': datetime.datetime.utcnow()
        }
        db.quiz_results.insert_one(quiz_result)
        
        # Update user progress
        user_progress = {
            'user_id': user_id,
            'content_id': quiz_id,
            'content_type': 'quiz',
            'status': 'completed',
            'score': score,
            'timestamp': datetime.datetime.utcnow()
        }
        user_progress_collection.insert_one(user_progress)
        
        # Notify Learning Engine about the quiz result
        try:
            requests.post(
                f"{LEARNING_ENGINE_URL}/api/learning-path/{user_id}/update",
                json={
                    'content_id': quiz_id,
                    'content_type': 'quiz',
                    'action': 'completed',
                    'score': score,
                    'time_spent': data['time_spent']
                }
            )
        except:
            # Log error but continue
            pass
        
        return jsonify({
            'message': 'Quiz submitted successfully',
            'result': {
                'score': score,
                'correct_answers': correct_answers,
                'total_questions': total_questions,
                'question_results': question_results
            }
        }), 200
        
    except ValidationError as err:
        return jsonify({'message': 'Validation error', 'errors': err.messages}), 400
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002) 