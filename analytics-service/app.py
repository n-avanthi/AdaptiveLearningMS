import os
import json
import datetime
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps, loads
import redis
from dotenv import load_dotenv
from celery_worker import process_analytics_task

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/adaptive_learning')
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client.get_database()
users_collection = db.users
quiz_results_collection = db.quiz_results
user_progress_collection = db.user_progress
user_metrics_collection = db.user_metrics
analytics_results_collection = db.analytics_results

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/3')
redis_client = redis.from_url(REDIS_URL)

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'analytics-service'})

# Get analytics for a specific student
@app.route('/api/analytics/students/<student_id>', methods=['GET'])
def get_student_analytics(student_id):
    try:
        # Try to get analytics from Redis cache
        cached_analytics = redis_client.get(f"student_analytics:{student_id}")
        if cached_analytics:
            return jsonify({'analytics': json.loads(cached_analytics)}), 200
        
        # If not in cache, generate analytics
        # This will trigger a Celery task for heavy processing
        task = process_analytics_task.delay('student', student_id)
        
        # For immediate response, get basic analytics from database
        user = users_collection.find_one({'_id': ObjectId(student_id)})
        if not user:
            return jsonify({'message': 'Student not found'}), 404
        
        # Get quiz results
        quiz_results = list(quiz_results_collection.find({'user_id': student_id}))
        
        # Get user progress
        user_progress = list(user_progress_collection.find({'user_id': student_id}))
        
        # Get user metrics
        user_metrics = user_metrics_collection.find_one({'user_id': student_id})
        
        # Calculate basic analytics
        analytics = calculate_student_analytics(user, quiz_results, user_progress, user_metrics)
        
        # Cache analytics in Redis (5 minutes expiry)
        redis_client.setex(f"student_analytics:{student_id}", 300, json.dumps(analytics))
        
        return jsonify({'analytics': analytics}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get teacher dashboard data
@app.route('/api/analytics/teachers/dashboard', methods=['GET'])
def get_teacher_dashboard():
    try:
        # Try to get dashboard data from Redis cache
        cached_dashboard = redis_client.get('teacher_dashboard')
        if cached_dashboard:
            return jsonify({'dashboard': json.loads(cached_dashboard)}), 200
        
        # If not in cache, generate dashboard data
        # This will trigger a Celery task for heavy processing
        task = process_analytics_task.delay('teacher_dashboard')
        
        # For immediate response, get basic dashboard data
        
        # Get all students
        students = list(users_collection.find({'role': 'student'}))
        
        # Get recent quiz results
        recent_quiz_results = list(quiz_results_collection.find().sort('timestamp', -1).limit(50))
        
        # Calculate basic dashboard data
        dashboard = calculate_teacher_dashboard(students, recent_quiz_results)
        
        # Cache dashboard in Redis (5 minutes expiry)
        redis_client.setex('teacher_dashboard', 300, json.dumps(dashboard))
        
        return jsonify({'dashboard': dashboard}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get performance summary
@app.route('/api/analytics/performance/summary', methods=['GET'])
def get_performance_summary():
    try:
        # Try to get summary from Redis cache
        cached_summary = redis_client.get('performance_summary')
        if cached_summary:
            return jsonify({'summary': json.loads(cached_summary)}), 200
        
        # If not in cache, generate summary
        # This will trigger a Celery task for heavy processing
        task = process_analytics_task.delay('performance_summary')
        
        # For immediate response, get basic summary data
        
        # Get all quiz results
        quiz_results = list(quiz_results_collection.find())
        
        # Get all user metrics
        user_metrics = list(user_metrics_collection.find())
        
        # Calculate basic summary
        summary = calculate_performance_summary(quiz_results, user_metrics)
        
        # Cache summary in Redis (10 minutes expiry)
        redis_client.setex('performance_summary', 600, json.dumps(summary))
        
        return jsonify({'summary': summary}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Helper function to calculate student analytics
def calculate_student_analytics(user, quiz_results, user_progress, user_metrics):
    analytics = {
        'user': {
            'id': str(user['_id']),
            'username': user['username'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'email': user['email']
        },
        'quiz_performance': {
            'total_quizzes': len(quiz_results),
            'average_score': 0,
            'highest_score': 0,
            'lowest_score': 100 if quiz_results else 0,
            'recent_scores': []
        },
        'progress': {
            'lessons_viewed': len([p for p in user_progress if p['content_type'] == 'lesson' and p['status'] == 'viewed']),
            'quizzes_completed': len([p for p in user_progress if p['content_type'] == 'quiz' and p['status'] == 'completed']),
            'recent_activity': []
        },
        'strengths_weaknesses': {
            'strengths': [],
            'weaknesses': []
        },
        'time_spent': {
            'total_time': 0,
            'average_time_per_quiz': 0
        }
    }
    
    # Calculate quiz performance metrics
    if quiz_results:
        scores = [result['score'] for result in quiz_results]
        analytics['quiz_performance']['average_score'] = sum(scores) / len(scores)
        analytics['quiz_performance']['highest_score'] = max(scores)
        analytics['quiz_performance']['lowest_score'] = min(scores)
        
        # Get recent scores (last 5)
        recent_results = sorted(quiz_results, key=lambda x: x['timestamp'], reverse=True)[:5]
        analytics['quiz_performance']['recent_scores'] = [
            {
                'quiz_id': result['quiz_id'],
                'score': result['score'],
                'timestamp': result['timestamp'].isoformat() if isinstance(result['timestamp'], datetime.datetime) else result['timestamp']
            }
            for result in recent_results
        ]
        
        # Calculate time spent
        total_time = sum([result.get('time_spent', 0) for result in quiz_results])
        analytics['time_spent']['total_time'] = total_time
        analytics['time_spent']['average_time_per_quiz'] = total_time / len(quiz_results)
    
    # Get recent activity
    recent_activity = sorted(user_progress, key=lambda x: x['timestamp'], reverse=True)[:10]
    analytics['progress']['recent_activity'] = [
        {
            'content_type': activity['content_type'],
            'content_id': activity['content_id'],
            'status': activity['status'],
            'timestamp': activity['timestamp'].isoformat() if isinstance(activity['timestamp'], datetime.datetime) else activity['timestamp'],
            'score': activity.get('score')
        }
        for activity in recent_activity
    ]
    
    # Get strengths and weaknesses from user metrics
    if user_metrics:
        analytics['strengths_weaknesses']['strengths'] = user_metrics.get('strengths', [])
        analytics['strengths_weaknesses']['weaknesses'] = user_metrics.get('weaknesses', [])
        
        # If not available in user metrics, calculate from topics
        if not analytics['strengths_weaknesses']['strengths'] and 'topics' in user_metrics:
            for topic, data in user_metrics['topics'].items():
                if data.get('average_score', 0) >= 80:
                    analytics['strengths_weaknesses']['strengths'].append(topic)
        
        if not analytics['strengths_weaknesses']['weaknesses'] and 'topics' in user_metrics:
            for topic, data in user_metrics['topics'].items():
                if data.get('average_score', 0) < 60:
                    analytics['strengths_weaknesses']['weaknesses'].append(topic)
    
    return analytics

# Helper function to calculate teacher dashboard
def calculate_teacher_dashboard(students, recent_quiz_results):
    dashboard = {
        'student_count': len(students),
        'recent_quiz_results': [],
        'performance_overview': {
            'average_score': 0,
            'students_above_average': 0,
            'students_below_average': 0,
            'students_at_risk': 0  # Students with consistently low scores
        },
        'activity_summary': {
            'active_students': 0,  # Students with activity in the last week
            'inactive_students': 0  # Students with no activity in the last week
        }
    }
    
    # Process recent quiz results
    if recent_quiz_results:
        # Calculate average score
        scores = [result['score'] for result in recent_quiz_results]
        dashboard['performance_overview']['average_score'] = sum(scores) / len(scores)
        
        # Format recent quiz results
        dashboard['recent_quiz_results'] = [
            {
                'quiz_id': result['quiz_id'],
                'user_id': result['user_id'],
                'score': result['score'],
                'timestamp': result['timestamp'].isoformat() if isinstance(result['timestamp'], datetime.datetime) else result['timestamp']
            }
            for result in recent_quiz_results[:10]  # Limit to 10 most recent
        ]
    
    # Count students above/below average and at risk
    for student in students:
        # Get student's quiz results
        student_results = list(quiz_results_collection.find({'user_id': str(student['_id'])}))
        
        if student_results:
            avg_score = sum([result['score'] for result in student_results]) / len(student_results)
            
            if avg_score >= dashboard['performance_overview']['average_score']:
                dashboard['performance_overview']['students_above_average'] += 1
            else:
                dashboard['performance_overview']['students_below_average'] += 1
            
            # Check if student is at risk (consistently low scores)
            if avg_score < 60:
                dashboard['performance_overview']['students_at_risk'] += 1
        
        # Check if student has been active in the last week
        one_week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        recent_activity = user_progress_collection.find_one({
            'user_id': str(student['_id']),
            'timestamp': {'$gte': one_week_ago}
        })
        
        if recent_activity:
            dashboard['activity_summary']['active_students'] += 1
        else:
            dashboard['activity_summary']['inactive_students'] += 1
    
    return dashboard

# Helper function to calculate performance summary
def calculate_performance_summary(quiz_results, user_metrics):
    summary = {
        'overall_performance': {
            'average_score': 0,
            'score_distribution': {
                '0-20': 0,
                '21-40': 0,
                '41-60': 0,
                '61-80': 0,
                '81-100': 0
            }
        },
        'topic_performance': {},
        'time_analysis': {
            'average_time_per_quiz': 0,
            'correlation_time_score': 0  # Correlation between time spent and score
        }
    }
    
    # Calculate overall performance metrics
    if quiz_results:
        scores = [result['score'] for result in quiz_results]
        summary['overall_performance']['average_score'] = sum(scores) / len(scores)
        
        # Calculate score distribution
        for score in scores:
            if score <= 20:
                summary['overall_performance']['score_distribution']['0-20'] += 1
            elif score <= 40:
                summary['overall_performance']['score_distribution']['21-40'] += 1
            elif score <= 60:
                summary['overall_performance']['score_distribution']['41-60'] += 1
            elif score <= 80:
                summary['overall_performance']['score_distribution']['61-80'] += 1
            else:
                summary['overall_performance']['score_distribution']['81-100'] += 1
        
        # Calculate time analysis
        times = [result.get('time_spent', 0) for result in quiz_results if 'time_spent' in result]
        if times:
            summary['time_analysis']['average_time_per_quiz'] = sum(times) / len(times)
            
            # Calculate correlation between time and score
            if len(times) == len(scores):
                try:
                    correlation = np.corrcoef(times, scores)[0, 1]
                    summary['time_analysis']['correlation_time_score'] = correlation
                except:
                    summary['time_analysis']['correlation_time_score'] = 0
    
    # Calculate topic performance
    topic_scores = {}
    
    for metrics in user_metrics:
        if 'topics' in metrics:
            for topic, data in metrics['topics'].items():
                if topic not in topic_scores:
                    topic_scores[topic] = []
                
                topic_scores[topic].extend(data.get('scores', []))
    
    for topic, scores in topic_scores.items():
        if scores:
            summary['topic_performance'][topic] = {
                'average_score': sum(scores) / len(scores),
                'number_of_attempts': len(scores)
            }
    
    return summary

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5004) 