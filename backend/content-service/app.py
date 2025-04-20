from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId, json_util
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Configure CORS to properly handle preflight requests
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True, "allow_headers": ["Authorization", "Content-Type"]}})

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
db = client["adaptive_lms"]
content_collection = db["content"]

# Helper function to convert MongoDB data to JSON
def parse_json(data):
    return json.loads(json_util.dumps(data))

@app.route('/')
def home():
    return jsonify({"message": "This is the Content Delivery Service"})

# Explicitly handle OPTIONS requests for CORS preflight
@app.route('/add-content', methods=['OPTIONS'])
def options_add_content():
    return '', 200

@app.route('/get-content', methods=['OPTIONS'])
def options_get_content():
    return '', 200

@app.route('/add-content', methods=['POST'])
def add_content():
    data = request.json
    required_fields = ["title", "subject", "level", "type", "content_url"]
    
    # Check if all required fields are present in the request
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing fields"}), 400
    
    try:
        result = content_collection.insert_one(data)  # Insert new content into the database
        # Return the created content including the MongoDB ID
        created_content = data.copy()
        created_content["_id"] = str(result.inserted_id)
        return jsonify(created_content), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Handle potential database errors

@app.route('/get-content', methods=['GET'])
def get_content():
    subject = request.args.get("subject")
    level = request.args.get("level")

    query = {}

    if subject:
        query["subject"] = subject
    if level:
        query["level"] = level
    
    try:
        # Find content based on query parameters (subject/level)
        content_list = list(content_collection.find(query))
        
        # Convert ObjectId to string for JSON serialization
        for content in content_list:
            content["_id"] = str(content["_id"])
        
        return jsonify(content_list) if content_list else jsonify([]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500  # Handle potential database errors

# Handle specific content item retrieval
@app.route('/content/<content_id>', methods=['GET'])
def get_specific_content(content_id):
    try:
        content = content_collection.find_one({"_id": ObjectId(content_id)})
        if content:
            content["_id"] = str(content["_id"])
            return jsonify(content), 200
        else:
            return jsonify({"error": "Content not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
# Generic OPTIONS handler for any route
@app.route('/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return '', 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)