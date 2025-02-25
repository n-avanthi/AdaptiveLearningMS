import os
import json
import datetime
import numpy as np
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
learning_paths_collection = db.learning_paths
user_progress_collection = db.user_progress
lessons_collection = db.lessons
quizzes_collection = db.quizzes
quiz_results_collection = db.quiz_results

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/2')
redis_client = redis.from_url(REDIS_URL)

# Validation schemas
class LearningPathUpdateSchema(Schema):
    content_id = fields.String(required=True)
    content_type = fields.String(required=True, validate=validate.OneOf(['lesson', 'quiz']))
    action = fields.String(required=True, validate=validate.OneOf(['viewed', 'completed']))
    score = fields.Float(required=False)
    time_spent = fields.Integer(required=False)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'learning-engine'})

# Get learning path for a user
@app.route('/api/learning-path/<user_id>', methods=['GET'])
def get_learning_path(user_id):
    try:
        # Try to get learning path from Redis cache
        cached_path = redis_client.get(f"learning_path:{user_id}")
        if cached_path:
            learning_path = json.loads(cached_path)
        else:
            # If not in cache, get from database
            learning_path_doc = learning_paths_collection.find_one({'user_id': user_id})
            
            if not learning_path_doc:
                # If no learning path exists, create a default one
                learning_path = create_default_learning_path(user_id)
            else:
                # Convert ObjectId to string for JSON serialization
                learning_path = loads(dumps(learning_path_doc))
            
            # Cache learning path in Redis (10 minutes expiry)
            redis_client.setex(f"learning_path:{user_id}", 600, dumps(learning_path))
        
        return jsonify({'learning_path': learning_path}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Update learning path based on user progress
@app.route('/api/learning-path/<user_id>/update', methods=['POST'])
def update_learning_path(user_id):
    try:
        # Validate request data
        schema = LearningPathUpdateSchema()
        data = schema.load(request.json)
        
        # Get current learning path
        learning_path_doc = learning_paths_collection.find_one({'user_id': user_id})
        
        if not learning_path_doc:
            # If no learning path exists, create a default one
            learning_path = create_default_learning_path(user_id)
        else:
            learning_path = learning_path_doc
        
        # Update user progress metrics
        update_user_metrics(user_id, data)
        
        # Update learning path based on the new data
        updated_path = adapt_learning_path(user_id, learning_path, data)
        
        # Update in database
        if learning_path_doc:
            learning_paths_collection.update_one(
                {'_id': learning_path['_id']},
                {'$set': updated_path}
            )
        else:
            learning_paths_collection.insert_one(updated_path)
        
        # Update Redis cache
        redis_client.setex(f"learning_path:{user_id}", 600, dumps(updated_path))
        
        return jsonify({
            'message': 'Learning path updated successfully',
            'learning_path': loads(dumps(updated_path))
        }), 200
        
    except ValidationError as err:
        return jsonify({'message': 'Validation error', 'errors': err.messages}), 400
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Helper function to create a default learning path
def create_default_learning_path(user_id):
    # Get all lessons and quizzes
    lessons = list(lessons_collection.find({}))
    quizzes = list(quizzes_collection.find({}))
    
    # Sort lessons by difficulty level (assuming lessons have a 'difficulty' field)
    lessons.sort(key=lambda x: x.get('difficulty', 0))
    
    # Create initial learning path with first few lessons
    recommended_lessons = [str(lesson['_id']) for lesson in lessons[:3]]
    recommended_quizzes = [str(quiz['_id']) for quiz in quizzes if str(quiz.get('lesson_id')) in recommended_lessons]
    
    learning_path = {
        'user_id': user_id,
        'recommended_lessons': recommended_lessons,
        'recommended_quizzes': recommended_quizzes,
        'completed_lessons': [],
        'completed_quizzes': [],
        'current_difficulty_level': 1,
        'performance_metrics': {
            'average_quiz_score': 0,
            'average_completion_time': 0,
            'strengths': [],
            'weaknesses': []
        },
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    # Insert into database
    result = learning_paths_collection.insert_one(learning_path)
    learning_path['_id'] = result.inserted_id
    
    return learning_path

# Helper function to update user metrics
def update_user_metrics(user_id, data):
    # If this is a quiz completion, update metrics
    if data['content_type'] == 'quiz' and data['action'] == 'completed':
        # Get quiz details
        quiz = quizzes_collection.find_one({'_id': ObjectId(data['content_id'])})
        if not quiz:
            return
        
        # Update user metrics in database
        user_metrics = db.user_metrics.find_one({'user_id': user_id})
        
        if not user_metrics:
            # Create new metrics document
            user_metrics = {
                'user_id': user_id,
                'quiz_scores': [data['score']],
                'average_score': data['score'],
                'completion_times': [data['time_spent']],
                'average_completion_time': data['time_spent'],
                'topics': {},
                'created_at': datetime.datetime.utcnow(),
                'updated_at': datetime.datetime.utcnow()
            }
            
            # Add topic performance if quiz has topics
            if 'topics' in quiz:
                for topic in quiz['topics']:
                    user_metrics['topics'][topic] = {
                        'scores': [data['score']],
                        'average_score': data['score']
                    }
            
            db.user_metrics.insert_one(user_metrics)
        else:
            # Update existing metrics
            scores = user_metrics.get('quiz_scores', []) + [data['score']]
            times = user_metrics.get('completion_times', []) + [data['time_spent']]
            
            avg_score = sum(scores) / len(scores)
            avg_time = sum(times) / len(times)
            
            update_data = {
                'quiz_scores': scores,
                'average_score': avg_score,
                'completion_times': times,
                'average_completion_time': avg_time,
                'updated_at': datetime.datetime.utcnow()
            }
            
            # Update topic performance if quiz has topics
            if 'topics' in quiz:
                for topic in quiz['topics']:
                    if topic not in user_metrics.get('topics', {}):
                        update_data[f'topics.{topic}'] = {
                            'scores': [data['score']],
                            'average_score': data['score']
                        }
                    else:
                        topic_scores = user_metrics['topics'][topic]['scores'] + [data['score']]
                        topic_avg = sum(topic_scores) / len(topic_scores)
                        update_data[f'topics.{topic}.scores'] = topic_scores
                        update_data[f'topics.{topic}.average_score'] = topic_avg
            
            db.user_metrics.update_one({'user_id': user_id}, {'$set': update_data})

# Helper function to adapt learning path based on user progress
def adapt_learning_path(user_id, current_path, new_data):
    # Deep copy the current path to avoid modifying the original
    updated_path = dict(current_path)
    
    # Mark content as completed if action is 'completed'
    if new_data['action'] == 'completed':
        if new_data['content_type'] == 'lesson':
            if new_data['content_id'] not in updated_path.get('completed_lessons', []):
                if 'completed_lessons' not in updated_path:
                    updated_path['completed_lessons'] = []
                updated_path['completed_lessons'].append(new_data['content_id'])
        elif new_data['content_type'] == 'quiz':
            if new_data['content_id'] not in updated_path.get('completed_quizzes', []):
                if 'completed_quizzes' not in updated_path:
                    updated_path['completed_quizzes'] = []
                updated_path['completed_quizzes'].append(new_data['content_id'])
    
    # If a quiz was completed, adjust difficulty based on score
    if new_data['content_type'] == 'quiz' and new_data['action'] == 'completed':
        score = new_data.get('score', 0)
        
        # Get user metrics
        user_metrics = db.user_metrics.find_one({'user_id': user_id})
        
        if user_metrics:
            # Adjust difficulty level based on recent performance
            current_level = updated_path.get('current_difficulty_level', 1)
            
            if score >= 90:
                # Excellent performance, increase difficulty
                new_level = min(current_level + 1, 5)  # Max level is 5
            elif score >= 70:
                # Good performance, maintain or slightly increase difficulty
                new_level = min(current_level + 0.5, 5)
            elif score >= 50:
                # Average performance, maintain difficulty
                new_level = current_level
            else:
                # Poor performance, decrease difficulty
                new_level = max(current_level - 0.5, 1)  # Min level is 1
            
            updated_path['current_difficulty_level'] = new_level
            
            # Update performance metrics
            updated_path['performance_metrics'] = {
                'average_quiz_score': user_metrics.get('average_score', 0),
                'average_completion_time': user_metrics.get('average_completion_time', 0),
                'strengths': identify_strengths(user_metrics),
                'weaknesses': identify_weaknesses(user_metrics)
            }
            
            # Recommend new content based on updated metrics
            updated_path = recommend_new_content(updated_path, user_metrics)
    
    updated_path['updated_at'] = datetime.datetime.utcnow()
    
    return updated_path

# Helper function to identify user strengths
def identify_strengths(user_metrics):
    strengths = []
    
    # Check topics with high scores
    for topic, data in user_metrics.get('topics', {}).items():
        if data.get('average_score', 0) >= 80:
            strengths.append(topic)
    
    return strengths

# Helper function to identify user weaknesses
def identify_weaknesses(user_metrics):
    weaknesses = []
    
    # Check topics with low scores
    for topic, data in user_metrics.get('topics', {}).items():
        if data.get('average_score', 0) < 60:
            weaknesses.append(topic)
    
    return weaknesses

# Helper function to recommend new content
def recommend_new_content(learning_path, user_metrics):
    # Get all lessons and quizzes
    all_lessons = list(lessons_collection.find({}))
    all_quizzes = list(quizzes_collection.find({}))
    
    # Filter out completed lessons
    completed_lessons = learning_path.get('completed_lessons', [])
    completed_quizzes = learning_path.get('completed_quizzes', [])
    
    # Filter lessons by difficulty level
    current_difficulty = learning_path.get('current_difficulty_level', 1)
    
    # Find lessons that match the current difficulty level (±0.5)
    suitable_lessons = [
        lesson for lesson in all_lessons
        if abs(lesson.get('difficulty', 1) - current_difficulty) <= 0.5
        and str(lesson['_id']) not in completed_lessons
    ]
    
    # Prioritize lessons that cover user's weaknesses
    weaknesses = learning_path.get('performance_metrics', {}).get('weaknesses', [])
    
    recommended_lessons = []
    
    # First add lessons that address weaknesses
    for lesson in suitable_lessons:
        if any(topic in lesson.get('topics', []) for topic in weaknesses):
            recommended_lessons.append(str(lesson['_id']))
    
    # Then add other suitable lessons
    for lesson in suitable_lessons:
        if str(lesson['_id']) not in recommended_lessons:
            recommended_lessons.append(str(lesson['_id']))
    
    # Limit to 5 recommended lessons
    recommended_lessons = recommended_lessons[:5]
    
    # Find quizzes related to recommended lessons
    recommended_quizzes = [
        str(quiz['_id']) for quiz in all_quizzes
        if str(quiz.get('lesson_id')) in recommended_lessons
        and str(quiz['_id']) not in completed_quizzes
    ]
    
    # Update learning path with new recommendations
    learning_path['recommended_lessons'] = recommended_lessons
    learning_path['recommended_quizzes'] = recommended_quizzes
    
    return learning_path

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003) 