from celery_worker import celery
from pymongo import MongoClient
from collections import defaultdict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@celery.task(name='tasks.generate_insights')
def generate_insights(username):
    logger.info(f"Processing insights for username: {username}")
    client = MongoClient("mongodb://localhost:27017/")
    db = client["adaptive_lms"]
    collection = db["performance_data"]
    records = list(collection.find({"username": username}))
    
    if not records:
        logger.info("No performance data found")
        return {"error": "No performance data found"}

    total_time = 0
    total_score = 0
    subject_scores = defaultdict(list)

    for record in records:
        score = record.get("score", 0)
        time_taken = record.get("time_taken", 0)
        subject = record.get("subject", "Unknown")

        total_time += time_taken
        total_score += score
        subject_scores[subject].append(score)

    avg_score = total_score / len(records)
    most_attempted_subject = max(subject_scores.items(), key=lambda x: len(x[1]))[0]
    weak_subjects = [subject for subject, scores in subject_scores.items() if sum(scores) / len(scores) < 50]

    result = {
        "average_score": round(avg_score, 2),
        "total_time_spent": total_time,
        "most_attempted_subject": most_attempted_subject,
        "weak_subjects": weak_subjects
    }
    logger.info(f"Generated insights: {result}")
    return result