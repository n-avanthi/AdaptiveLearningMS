import bcrypt
import jwt
import datetime
import re  # for email validation
from flask import Flask, request, jsonify
from pymongo import MongoClient
from functools import wraps
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY", "fallback_secret")

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://mongodb:27017/"))
db = client["adaptive_lms"]
users_collection = db["users"]

# Setup logging
logging.basicConfig(level=logging.DEBUG)

@app.route('/')
def home():
    return jsonify({"message": "This is the User Service"})


@app.route('/register', methods=['POST'])
def register():
    data = request.json
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")  

    # Check for valid role
    if not role or role not in ["student", "teacher", "admin"]:
        return jsonify({"error": "Invalid or missing role"}), 400

    # Check for valid email
    if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email address"}), 400

    # Ensure username and password exist
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    if users_collection.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    users_collection.insert_one({
        "username": username,
        "email": email,
        "password": hashed_pw,
        "role": role
    })

    return jsonify({"message": "User registered successfully!"}), 201


@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    user = users_collection.find_one({"username": username})
    if not user:
        return jsonify({"error": "Username/Password is invalid"}), 404

    if not bcrypt.checkpw(password.encode('utf-8'), user["password"]):
        return jsonify({"error": "Username/Password is invalid"}), 401

    # Log the successful login attempt
    # logging.info(f"User {username} logged in successfully")

    token = jwt.encode({
        "username": username,
        "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    }, app.config['SECRET_KEY'], algorithm='HS256')

    # Log the JWT token generated for the user
    # logging.info(f"JWT Token generated for user {username}: {token}")

    return jsonify({"token": token})


# Decorator to protect routes
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            # logging.warning("Token is missing in the request")
            return jsonify({"error": "Token is missing"}), 403

        # Extract token if it starts with Bearer
        if token.startswith('Bearer '):
            token = token.split(' ')[1]

        try:
            # Log the received token
            # logging.info(f"Processed token: {token}")

            # Decode the token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = data["username"]
            user_role = data["role"]

            # Log the decoded token data
            # logging.info(f"Decoded token for user {current_user}: {data}")

        except jwt.ExpiredSignatureError:
            # logging.error("Token has expired")
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError as e:
            # logging.error(f"Invalid token error: {str(e)}")
            return jsonify({"error": "Token is invalid"}), 401

        return f(current_user, user_role, *args, **kwargs)

    return decorated


@app.route('/profile', methods=['GET'])
@token_required
def profile(current_user, user_role):
    user = users_collection.find_one({"username": current_user}, {"_id": 0, "password": 0})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

# Add this to user-service
@app.route('/verify-token', methods=['GET'])
def verify_token():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({"error": "No token provided"}), 400
    
    # Extract token if it starts with Bearer
    if token.startswith('Bearer '):
        token = token.split(' ')[1]
    
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return jsonify({"message": "Token is valid", "data": data}), 200
    except Exception as e:
        return jsonify({"error": f"Token verification failed: {str(e)}"}), 400


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
