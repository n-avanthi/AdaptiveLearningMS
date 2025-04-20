from flask import Flask, request, jsonify
from pymongo import MongoClient
import datetime
from tasks import generate_insights
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection setup
client = MongoClient("mongodb://localhost:27017/")
db = client["adaptive_lms"]
collection = db["performance_data"]

@app.route('/')
def home():
    return jsonify({"message": "This is the analytics service"})

@app.route('/submit-performance', methods=['POST'])
def submit_performance():
    data = request.json
    data['timestamp'] = datetime.datetime.utcnow()

    try:
        # Insert performance data into MongoDB collection
        collection.insert_one(data)
        return jsonify({"message": "Performance data submitted successfully"}), 200
    except Exception as e:
        # Log and return error if MongoDB insertion fails
        logger.error(f"Error submitting performance data: {str(e)}")
        return jsonify({"error": "Failed to submit performance data"}), 500

@app.route('/insights/<username>', methods=['GET'])
def insights(username):
    try:
        # Trigger the Celery task to generate insights
        task = generate_insights.delay(username)
        logger.info(f"Submitted task for {username}, task_id: {task.id}")
        return jsonify({"task_id": task.id, "status": "Processing"}), 202
    except Exception as e:
        # Handle any errors that occur while submitting the task
        logger.error(f"Error submitting task for {username}: {str(e)}")
        return jsonify({"error": "Failed to submit task"}), 500

@app.route('/task-status/<task_id>', methods=['GET'])
def task_status(task_id):
    try:
        # Check the status of the Celery task
        task = generate_insights.AsyncResult(task_id)
        if task.state == "PENDING":
            return jsonify({"status": "Pending"})
        elif task.state == "SUCCESS":
            return jsonify({"status": "Completed", "result": task.result})
        else:
            return jsonify({"status": task.state})
    except Exception as e:
        # Log any error checking the task status
        logger.error(f"Error checking task status {task_id}: {str(e)}")
        return jsonify({"error": "Failed to check task status"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5003, debug=True)
