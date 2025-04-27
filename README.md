# Adaptive LMS Project

This project implements an Adaptive Learning Management System (LMS) using a microservices architecture. It consists of a frontend application and several backend microservices managed via Docker.

## Project Structure

```
.
├── backend/
│   ├── api-gateway/        # Handles incoming requests, authentication, and routing
│   ├── content-service/    # Manages learning content (creation, retrieval)
│   ├── user-service/       # Manages user registration, login, and profiles
│   ├── quiz-service/       # Manages quizzes, submissions, and feedback
│   ├── adaptive-engine/    # (Currently inactive) Intended for adaptive learning logic
│   ├── analytics-service/  # (Currently inactive) Intended for analytics and reporting
│   ├── docker-compose.yml  # Defines and orchestrates the backend services
│   └── ...                 # Other service-specific files and tests
├── frontend/
│   ├── public/             # Static assets
│   ├── src/                # Frontend source code (likely React)
│   ├── package.json        # Frontend dependencies and scripts
│   ├── vite.config.js      # Vite build configuration
│   └── ...                 # Other frontend files
└── README.md               # This file
```

## Backend Overview

The backend follows a microservices pattern orchestrated using Docker Compose.

### Services:

1.  **API Gateway (`api-gateway`)**:
    *   Built with Flask.
    *   Acts as the single entry point for the frontend.
    *   Handles Cross-Origin Resource Sharing (CORS).
    *   Implements JWT-based authentication and authorization (roles: `student`, `teacher`, `admin`).
    *   Routes requests to the appropriate downstream microservice.
    *   Listens on port 8000.

2.  **User Service (`user-service`)**:
    *   Manages user accounts: registration, login, profile management.
    *   Likely interacts with the MongoDB database for persistence.
    *   Listens on port 5000.

3.  **Content Service (`content-service`)**:
    *   Manages educational content: creation, modification, retrieval.
    *   Interacts with the MongoDB database.
    *   Listens on port 5001.

4.  **Quiz Service (`quiz-service`)**:
    *   Manages quizzes: creation (teachers/admins), retrieval (all roles), submission (students), grading (likely via `quiz-worker`).
    *   Provides feedback status and results retrieval.
    *   Interacts with MongoDB and Redis (likely for task queueing/caching).
    *   Listens on port 5004.

5.  **Quiz Worker (`quiz-worker`)**:
    *   A background worker process associated with the `quiz-service`.
    *   Likely handles asynchronous tasks such as grading quiz submissions.
    *   Depends on `quiz-service`, `mongodb`, and `redis`.

6.  **MongoDB (`mongodb`)**:
    *   The primary NoSQL database used by most services for data persistence.
    *   Runs in a Docker container.

7.  **Redis (`redis`)**:
    *   An in-memory data store used for caching and potentially as a message broker for the `quiz-service` and `quiz-worker`.
    *   Runs in a Docker container.

### Inactive Services:

*   **Adaptive Engine (`adaptive-engine`)**: Intended to provide adaptive learning features based on user performance. Currently commented out in `docker-compose.yml`.
*   **Analytics Service (`analytics-service`)**: Intended to collect and process user interaction data for analytics. Currently commented out in `docker-compose.yml`.

## Frontend Overview

*   Located in the `frontend/` directory.
*   Appears to be a modern JavaScript application, likely using React (based on typical file structure and `vite.config.js`).
*   Uses `vite` as the build tool.
*   Interacts with the backend via the API Gateway (running on `http://localhost:8000` when run locally or via Docker).

## Getting Started

### Prerequisites

*   Docker and Docker Compose
*   Node.js and npm (or yarn) for frontend development

### Running the Application (Docker)

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```
2.  **Build and start the services:**
    ```bash
    docker-compose up --build -d
    ```
    This will build the Docker images for each service (if they don't exist) and start the containers in detached mode.
3.  **Access the frontend:** The frontend is likely configured to run separately (or needs its setup steps added here). Typically, you would:
    ```bash
    cd ../frontend
    npm install # or yarn install
    npm run dev # or yarn dev
    ```
    Open your browser to the address provided by Vite (usually `http://localhost:5173` or similar).
4.  **Access the API Gateway:** The gateway is available at `http://localhost:8000`.

### Stopping the Application

1.  **Stop and remove the backend containers:**
    ```bash
    cd backend
    docker-compose down
    ```

## Environment Variables

The API Gateway uses a `JWT_SECRET` for signing tokens. Ensure this is set appropriately (e.g., in a `.env` file within the `api-gateway` directory).

## Key Technologies

*   **Backend:** Python (Flask), JWT
*   **Frontend:** JavaScript (Likely React), Vite
*   **Database:** MongoDB
*   **Caching/Queueing:** Redis
*   **Orchestration:** Docker, Docker Compose 