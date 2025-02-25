# Adaptive Learning System

A microservices-based platform that provides personalized learning paths for students and real-time analytics for teachers.

## Configuration Placeholders

Before running this project, you'll need to replace the following placeholders with your actual values:

1. **Repository URL**: Replace `<repository-url>` in the clone command with the actual Git repository URL.

2. **JWT Secret Key**: In `docker-compose.yml`, replace `your_jwt_secret_key` with a strong, unique secret key for JWT token generation and validation.

3. **MongoDB Connection**: The default configuration uses a Docker container for MongoDB. If you want to use an external MongoDB instance, update the `MONGODB_URI` environment variables in `docker-compose.yml`.

4. **Redis Connection**: Similar to MongoDB, update the `REDIS_URL` if you're using an external Redis instance.

5. **API Endpoints**: If you deploy the services with different hostnames or ports, update the service URL environment variables in the API Gateway configuration.

6. **Email Configuration**: For services that send emails (like user registration), you'll need to add SMTP configuration details to the respective service environment variables.

## Project Overview

The Adaptive Learning System dynamically adjusts learning content based on student performance (e.g., quiz scores, completion times, difficulty levels) and provides teachers with real-time insights into student progress. It uses a microservices architecture with Redis for fast data processing and caching, and AI/ML algorithms for adaptive learning paths.

## Architecture

The system consists of the following microservices:

1. **User Management Service**: Handles user registration, login, and profile management
2. **Content Delivery Service**: Serves learning content to students
3. **Adaptive Learning Engine Service**: Analyzes student performance and adjusts learning paths
4. **Analytics Service**: Processes student performance metrics and generates insights
5. **API Gateway**: Routes requests to appropriate microservices

## Tech Stack

- **Frontend**: React.js
- **Backend**: Python (Flask) for microservices, Celery for task queuing, Redis-py for Redis integration, JWT for authentication
- **Database**: MongoDB (persistent storage), Redis (in-memory cache for real-time data)
- **Other Tools**: Docker (for containerization)

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js and npm (for frontend development)
- Python 3.8+ (for local development)

### Running the Application

1. Clone the repository
2. Navigate to the project directory
3. Run the following command to start all services:

```bash
docker-compose up
```

4. Access the application at http://localhost:3000

## Running the Project

### Step-by-Step Guide

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd adaptive-learning-system
   ```

2. **Build and start all services**
   ```bash
   # Start all services in the foreground
   docker-compose up
   
   # Or start in detached mode (background)
   docker-compose up -d
   ```

3. **Verify services are running**
   ```bash
   docker-compose ps
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:5000
   - User Service: http://localhost:5001
   - Content Service: http://localhost:5002
   - Learning Engine: http://localhost:5003
   - Analytics Service: http://localhost:5004

5. **View logs for a specific service**
   ```bash
   docker-compose logs -f <service-name>
   ```
   Replace `<service-name>` with one of: api-gateway, user-service, content-service, learning-engine, analytics-service, frontend

6. **Stop the application**
   ```bash
   # If running in foreground, use Ctrl+C
   
   # If running in detached mode
   docker-compose down
   ```

### Troubleshooting

- **Services not starting properly**: Check logs with `docker-compose logs <service-name>`
- **Database connection issues**: Ensure MongoDB and Redis containers are running
- **Port conflicts**: Make sure ports 3000, 5000-5004, 27017, and 6379 are not in use by other applications

### Development Mode

For development with hot-reloading:

1. Start the backend services:
   ```bash
   docker-compose up -d mongodb redis api-gateway user-service content-service learning-engine analytics-service
   ```

2. Run the frontend locally:
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. The frontend will be available at http://localhost:3000 with hot-reloading enabled

## API Endpoints

### User Management Service (http://localhost:5001)

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Content Delivery Service (http://localhost:5002)

- `GET /api/content/lessons` - Get available lessons
- `GET /api/content/lessons/{id}` - Get specific lesson
- `GET /api/content/quizzes/{id}` - Get quiz by ID
- `POST /api/content/quizzes/{id}/submit` - Submit quiz answers

### Adaptive Learning Engine Service (http://localhost:5003)

- `GET /api/learning-path/{user_id}` - Get personalized learning path
- `POST /api/learning-path/{user_id}/update` - Update learning path based on performance

### Analytics Service (http://localhost:5004)

- `GET /api/analytics/students/{id}` - Get analytics for a specific student
- `GET /api/analytics/teachers/dashboard` - Get teacher dashboard data
- `GET /api/analytics/performance/summary` - Get performance summary

## Development

Each microservice can be developed and tested independently. Refer to the README in each service directory for specific development instructions.

## License

MIT 