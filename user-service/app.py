import os
import json
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from bson.json_util import dumps
import redis
from dotenv import load_dotenv
from marshmallow import Schema, fields, validate, ValidationError
import re

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/adaptive_learning')
mongo_client = MongoClient(MONGODB_URI)
db = mongo_client.get_database()
users_collection = db.users

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
redis_client = redis.from_url(REDIS_URL)

# JWT configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your_jwt_secret_key')
JWT_EXPIRATION_HOURS = 24

# Custom email validator with regex
def email_validator(email):
    email_regex = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_regex, email):
        raise validate.ValidationError("Invalid email format. Please enter a valid email address.")
    
# Validation schemas
class UserRegistrationSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=3, max=50))
    email = fields.String(required=True, validate=email_validator)
    password = fields.String(required=True, validate=validate.Length(min=8))
    role = fields.String(required=True, validate=validate.OneOf(['student', 'teacher']))
    first_name = fields.String(required=True)
    last_name = fields.String(required=True)

class UserLoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

class UserProfileUpdateSchema(Schema):
    first_name = fields.String()
    last_name = fields.String()
    email = fields.Email()
    preferences = fields.Dict()

# Helper function to generate JWT token
def generate_token(user_id, role):
    now = datetime.now(timezone.utc)
    payload = {
        'exp': now + timedelta(hours=JWT_EXPIRATION_HOURS),  # Expiry time
        'iat': now,  # Issued at time
        'sub': str(user_id),  # Subject (user ID)
        'role': role
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

# Health check endpoint
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "healthy",
        "service": "user-service",
        "available_endpoints": [
            "/api/auth/register",
            "/api/auth/login",
            "/api/users/profile/{id}",
        ]
    })

# User registration endpoint
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        # Validate request data
        schema = UserRegistrationSchema()
        data = schema.load(request.json)
        
        # Check if user already exists
        if users_collection.find_one({'email': data['email']}):
            return jsonify({'message': 'User already exists with this email'}), 409
        
        if users_collection.find_one({'username': data['username']}):
            return jsonify({'message': 'Username already taken'}), 409
        
        # Hash the password
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # Create user document
        user = {
            'username': data['username'],
            'email': data['email'],
            'password': hashed_password.decode('utf-8'),
            'role': data['role'],
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'created_at': datetime.now(timezone.utc),
            'updated_at': datetime.now(timezone.utc),
            'preferences': {},
            'active': True
        }
        
        # Insert user into database
        result = users_collection.insert_one(user)
        user_id = result.inserted_id
        
        # Generate JWT token
        token = generate_token(user_id, data['role'])
        
        # Cache user data in Redis
        user_data = {
            'id': str(user_id),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name']
        }
        redis_client.setex(f"user:{user_id}", 3600, json.dumps(user_data))
        
        return jsonify({
            'message': 'User registered successfully',
            'token': token,
            'user': {
                'id': str(user_id),
                'username': user['username'],
                'email': user['email'],
                'role': user['role'],
                'first_name': user['first_name'],
                'last_name': user['last_name']
            }
        }), 201
        
    except ValidationError as err:
        return jsonify({'message': 'Validation error', 'errors': err.messages}), 400
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# User login endpoint
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        # Validate request data
        schema = UserLoginSchema()
        data = schema.load(request.json)
        
        # Find user by email
        user = users_collection.find_one({'email': data['email']})
        if not user:
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'message': 'Invalid email or password'}), 401
        
        # Generate JWT token
        token = generate_token(user['_id'], user['role'])
        
        # Cache user data in Redis
        user_data = {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name']
        }
        redis_client.setex(f"user:{user['_id']}", 3600, json.dumps(user_data))
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user_data
        }), 200
        
    except ValidationError as err:
        return jsonify({'message': 'Validation error', 'errors': err.messages}), 400
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Get user profile endpoint
@app.route('/api/users/profile', methods=['GET'])
def get_profile():
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Try to get user data from Redis cache
        cached_user = redis_client.get(f"user:{user_id}")
        if cached_user:
            return jsonify({'user': json.loads(cached_user)}), 200
        
        # If not in cache, get from database
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Prepare user data (exclude password)
        user_data = {
            'id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'preferences': user.get('preferences', {}),
            'created_at': user['created_at'].isoformat() if 'created_at' in user else None
        }
        
        # Cache user data in Redis
        redis_client.setex(f"user:{user_id}", 3600, json.dumps(user_data))
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

# Update user profile endpoint
@app.route('/api/users/profile', methods=['PUT'])
def update_profile():
    try:
        # Get user ID from header (set by API Gateway)
        user_id = request.headers.get('X-User-ID')
        if not user_id:
            return jsonify({'message': 'User ID not provided'}), 400
        
        # Validate request data
        schema = UserProfileUpdateSchema()
        data = schema.load(request.json)
        
        # Find user in database
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'message': 'User not found'}), 404
        
        # Update user data
        update_data = {
            'updated_at': datetime.now(timezone.utc)
        }
        
        if 'first_name' in data:
            update_data['first_name'] = data['first_name']
        
        if 'last_name' in data:
            update_data['last_name'] = data['last_name']
        
        if 'email' in data:
            # Check if email is already taken by another user
            existing_user = users_collection.find_one({'email': data['email'], '_id': {'$ne': ObjectId(user_id)}})
            if existing_user:
                return jsonify({'message': 'Email already in use by another account'}), 409
            update_data['email'] = data['email']
        
        if 'preferences' in data:
            update_data['preferences'] = data['preferences']
        
        # Update user in database
        users_collection.update_one({'_id': ObjectId(user_id)}, {'$set': update_data})
        
        # Get updated user data
        updated_user = users_collection.find_one({'_id': ObjectId(user_id)})
        
        # Prepare user data (exclude password)
        user_data = {
            'id': str(updated_user['_id']),
            'username': updated_user['username'],
            'email': updated_user['email'],
            'role': updated_user['role'],
            'first_name': updated_user['first_name'],
            'last_name': updated_user['last_name'],
            'preferences': updated_user.get('preferences', {}),
            'updated_at': updated_user['updated_at'].isoformat() if 'updated_at' in updated_user else None
        }
        
        # Update user data in Redis cache
        redis_client.setex(f"user:{user_id}", 3600, json.dumps(user_data))
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user_data
        }), 200
        
    except ValidationError as err:
        return jsonify({'message': 'Validation error', 'errors': err.messages}), 400
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 

