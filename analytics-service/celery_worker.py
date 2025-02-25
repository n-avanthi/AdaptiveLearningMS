import os
import json
import datetime
import pandas as pd
import numpy as np
from celery import Celery
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps, loads
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

# Celery configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/4')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/4')

celery = Celery('analytics_tasks', broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

@celery.task(name='process_analytics_task')
def process_analytics_task(task_type, *args, **kwargs):
    """
    Process analytics tasks in the background.
    
    Args:
        task_type (str): Type of analytics task ('student', 'teacher_dashboard', 'performance_summary')
        args: Additional positional arguments
        kwargs: Additional keyword arguments
    
    Returns:
        dict: Result of the analytics task
    """
    try:
        if task_type == 'student':
            student_id = args[0]
            return process_student_analytics(student_id)
        elif task_type == 'teacher_dashboard':
            return process_teacher_dashboard()
        elif task_type == 'performance_summary':
            return process_performance_summary()
        else:
            return {'error': f'Unknown task type: {task_type}'}
    except Exception as e:
        return {'error': str(e)}

def process_student_analytics(student_id):
    """
    Process detailed analytics for a specific student.
    
    Args:
        student_id (str): ID of the student
    
    Returns:
        dict: Detailed student analytics
    """
    # Get user data
    user = users_collection.find_one({'_id': ObjectId(student_id)})
    if not user:
        return {'error': 'Student not found'}
    
    # Get quiz results
    quiz_results = list(quiz_results_collection.find({'user_id': student_id}))
    
    # Get user progress
    user_progress = list(user_progress_collection.find({'user_id': student_id}))
    
    # Get user metrics
    user_metrics = user_metrics_collection.find_one({'user_id': student_id})
    
    # Basic analytics (same as in app.py)
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
    
    # Add more detailed analytics (trend analysis, etc.)
    if quiz_results:
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame([
            {
                'score': result['score'],
                'time_spent': result.get('time_spent', 0),
                'timestamp': result['timestamp']
            }
            for result in quiz_results
        ])
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Calculate trend (improvement over time)
        if len(df) >= 3:  # Need at least 3 points for meaningful trend
            # Simple linear regression for trend
            x = np.arange(len(df))
            y = df['score'].values
            
            if len(x) == len(y) and len(x) > 0:
                try:
                    slope = np.polyfit(x, y, 1)[0]
                    analytics['quiz_performance']['trend'] = {
                        'slope': slope,
                        'improving': slope > 0,
                        'trend_description': 'improving' if slope > 0 else 'declining' if slope < 0 else 'stable'
                    }
                except:
                    analytics['quiz_performance']['trend'] = {
                        'slope': 0,
                        'improving': False,
                        'trend_description': 'stable'
                    }
    
    # Cache the detailed analytics in Redis (longer expiry)
    redis_client.setex(f"student_analytics:{student_id}", 1800, json.dumps(analytics))
    
    # Store in database for historical reference
    analytics_record = {
        'user_id': student_id,
        'type': 'student_analytics',
        'data': analytics,
        'timestamp': datetime.datetime.utcnow()
    }
    analytics_results_collection.insert_one(analytics_record)
    
    return analytics

def process_teacher_dashboard():
    """
    Process detailed analytics for the teacher dashboard.
    
    Returns:
        dict: Detailed teacher dashboard data
    """
    # Get all students
    students = list(users_collection.find({'role': 'student'}))
    
    # Get all quiz results
    all_quiz_results = list(quiz_results_collection.find())
    
    # Basic dashboard (same as in app.py)
    dashboard = {
        'student_count': len(students),
        'recent_quiz_results': [],
        'performance_overview': {
            'average_score': 0,
            'students_above_average': 0,
            'students_below_average': 0,
            'students_at_risk': 0
        },
        'activity_summary': {
            'active_students': 0,
            'inactive_students': 0
        }
    }
    
    # Process quiz results
    if all_quiz_results:
        # Calculate average score
        scores = [result['score'] for result in all_quiz_results]
        dashboard['performance_overview']['average_score'] = sum(scores) / len(scores)
        
        # Get recent quiz results
        recent_results = sorted(all_quiz_results, key=lambda x: x['timestamp'], reverse=True)[:10]
        dashboard['recent_quiz_results'] = [
            {
                'quiz_id': result['quiz_id'],
                'user_id': result['user_id'],
                'score': result['score'],
                'timestamp': result['timestamp'].isoformat() if isinstance(result['timestamp'], datetime.datetime) else result['timestamp']
            }
            for result in recent_results
        ]
    
    # Process student data
    student_performance = []
    
    for student in students:
        student_id = str(student['_id'])
        
        # Get student's quiz results
        student_results = [r for r in all_quiz_results if r['user_id'] == student_id]
        
        # Calculate average score
        avg_score = sum([r['score'] for r in student_results]) / len(student_results) if student_results else 0
        
        # Check if student is at risk
        is_at_risk = avg_score < 60 and len(student_results) > 0
        
        # Check if student has been active in the last week
        one_week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        recent_activity = user_progress_collection.find_one({
            'user_id': student_id,
            'timestamp': {'$gte': one_week_ago}
        })
        is_active = recent_activity is not None
        
        # Update dashboard counters
        if avg_score >= dashboard['performance_overview']['average_score'] and len(student_results) > 0:
            dashboard['performance_overview']['students_above_average'] += 1
        elif len(student_results) > 0:
            dashboard['performance_overview']['students_below_average'] += 1
        
        if is_at_risk:
            dashboard['performance_overview']['students_at_risk'] += 1
        
        if is_active:
            dashboard['activity_summary']['active_students'] += 1
        else:
            dashboard['activity_summary']['inactive_students'] += 1
        
        # Add to student performance list
        student_performance.append({
            'student_id': student_id,
            'name': f"{student['first_name']} {student['last_name']}",
            'average_score': avg_score,
            'quizzes_taken': len(student_results),
            'is_at_risk': is_at_risk,
            'is_active': is_active
        })
    
    # Add detailed student performance to dashboard
    dashboard['student_performance'] = sorted(
        student_performance,
        key=lambda x: x['average_score'],
        reverse=True
    )
    
    # Add topic performance analysis
    topic_performance = {}
    
    for metrics in user_metrics_collection.find():
        if 'topics' in metrics:
            for topic, data in metrics['topics'].items():
                if topic not in topic_performance:
                    topic_performance[topic] = {
                        'scores': [],
                        'students': 0
                    }
                
                topic_performance[topic]['scores'].extend(data.get('scores', []))
                topic_performance[topic]['students'] += 1
    
    dashboard['topic_performance'] = {
        topic: {
            'average_score': sum(data['scores']) / len(data['scores']) if data['scores'] else 0,
            'student_count': data['students'],
            'difficulty_level': 'Hard' if sum(data['scores']) / len(data['scores']) < 60 else 'Medium' if sum(data['scores']) / len(data['scores']) < 80 else 'Easy' if data['scores'] else 'Unknown'
        }
        for topic, data in topic_performance.items()
    }
    
    # Cache the detailed dashboard in Redis (longer expiry)
    redis_client.setex('teacher_dashboard', 1800, json.dumps(dashboard))
    
    # Store in database for historical reference
    analytics_record = {
        'type': 'teacher_dashboard',
        'data': dashboard,
        'timestamp': datetime.datetime.utcnow()
    }
    analytics_results_collection.insert_one(analytics_record)
    
    return dashboard

def process_performance_summary():
    """
    Process detailed performance summary analytics.
    
    Returns:
        dict: Detailed performance summary
    """
    # Get all quiz results
    quiz_results = list(quiz_results_collection.find())
    
    # Get all user metrics
    user_metrics = list(user_metrics_collection.find())
    
    # Basic summary (same as in app.py)
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
            'correlation_time_score': 0
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
    
    # Add more detailed analytics
    if quiz_results:
        # Convert to DataFrame for easier analysis
        df = pd.DataFrame([
            {
                'score': result['score'],
                'time_spent': result.get('time_spent', 0),
                'timestamp': result['timestamp'],
                'user_id': result['user_id'],
                'quiz_id': result['quiz_id']
            }
            for result in quiz_results
        ])
        
        # Add time-based analysis
        if 'timestamp' in df.columns:
            df['date'] = pd.to_datetime(df['timestamp']).dt.date
            
            # Group by date and calculate average score per day
            daily_scores = df.groupby('date')['score'].mean().reset_index()
            
            # Convert to list of dictionaries for JSON serialization
            summary['time_based_analysis'] = {
                'daily_average_scores': [
                    {
                        'date': row['date'].isoformat(),
                        'average_score': row['score']
                    }
                    for _, row in daily_scores.iterrows()
                ]
            }
        
        # Add quiz difficulty analysis
        quiz_difficulty = df.groupby('quiz_id')['score'].mean().reset_index()
        quiz_difficulty['difficulty'] = quiz_difficulty['score'].apply(
            lambda x: 'Hard' if x < 60 else 'Medium' if x < 80 else 'Easy'
        )
        
        summary['quiz_analysis'] = {
            'quiz_difficulty': [
                {
                    'quiz_id': row['quiz_id'],
                    'average_score': row['score'],
                    'difficulty': row['difficulty']
                }
                for _, row in quiz_difficulty.iterrows()
            ]
        }
    
    # Cache the detailed summary in Redis (longer expiry)
    redis_client.setex('performance_summary', 1800, json.dumps(summary))
    
    # Store in database for historical reference
    analytics_record = {
        'type': 'performance_summary',
        'data': summary,
        'timestamp': datetime.datetime.utcnow()
    }
    analytics_results_collection.insert_one(analytics_record)
    
    return summary

if __name__ == '__main__':
    celery.start() 