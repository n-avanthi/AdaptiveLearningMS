from flask import Flask, request, jsonify
import redis
import random
import requests
import json
import time

app = Flask(__name__)

# Connect to Redis server
r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# URL of Content Service
CONTENT_SERVICE_URL = "http://localhost:5001/get-content"

@app.route('/')
def home():
    return jsonify({"message": "This is the Adaptive Engine Service"})

def determine_next_level(score, difficulty):
    levels = ["Beginner", "Intermediate", "Advanced"]
    
    # Ensure score is an integer
    try:
        score = int(score)
    except (ValueError, TypeError):
        # If conversion fails, keep the current difficulty
        return difficulty

    if score >= 80 and difficulty != "Advanced":
        return levels[levels.index(difficulty) + 1]
    elif score < 50 and difficulty != "Beginner":
        return levels[levels.index(difficulty) - 1]
    else:
        return difficulty

@app.route('/recommend', methods=['POST'])
def recommend():
    data = request.json
    username = data.get("username")
    score = data.get("score")

    try:
        score = int(score)  # Add this line to convert the string to an integer
    except (ValueError, TypeError):
        return jsonify({"error": "Score must be a valid number"}), 400

    difficulty = data.get("difficulty")
    subject = data.get("subject", "Mathematics")  # Default to Mathematics if subject is not provided

    # Determine the next level based on the score and current difficulty
    next_level = determine_next_level(score, difficulty)

    try:
        # Call Content Service to get content based on the subject and next level
        response = requests.get(CONTENT_SERVICE_URL, params={"subject": subject, "level": next_level})
        print(f"Content service response status: {response.status_code}")
        print(f"Content service response body: {response.text}")
        content = response.json()
        print(f"Parsed content: {content}, Type: {type(content)}, Length: {len(content) if isinstance(content, list) else 'N/A'}")

        if content:
            selected = random.choice(content)

            # Store the recommended content in Redis for 1 hour
            r.setex(username, 3600, json.dumps(selected))

            # Store user's learning history (last 10 items)
            entry = {
                "timestamp": int(time.time()),
                "content": selected
            }
            r.rpush(f"history:{username}", json.dumps(entry))
            r.ltrim(f"history:{username}", -10, -1)  # Keep only the last 10 items

            return jsonify({"next_content": selected})
        else:
            return jsonify({"error": "No content found for this level"}), 404
    except requests.exceptions.RequestException as e:
        # Handle errors from Content Service
        return jsonify({"error": f"Error contacting Content Service: {str(e)}"}), 503
    except redis.exceptions.ConnectionError as e:
        # Handle Redis connection errors
        return jsonify({"error": f"Error connecting to Redis: {str(e)}"}), 500
    except Exception as e:
        # Handle other exceptions
        return jsonify({"error": str(e)}), 500

@app.route('/last-recommendation/<username>', methods=['GET'])
def last_recommendation(username):
    last = r.get(username)
    try:
        if last:
            return jsonify({"last_recommendation": json.loads(last)})
        else:
            return jsonify({"message": "No recommendation found"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Corrupted data in Redis for this user"}), 500

@app.route('/learning-history/<username>', methods=['GET'])
def learning_history(username):
    history_raw = r.lrange(f"history:{username}", 0, -1)
    history = [json.loads(item) for item in history_raw]
    return jsonify({"history": history})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
