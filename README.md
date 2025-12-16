# LearnFlow

Interactive, AI-assisted learning from YouTube videos. LearnFlow fetches transcripts, generates checkpoints and quizzes with GPT, and tracks learner progress with Firebase-authenticated users.

## Features
- Checkpoints on the video timeline with completion tracking
- Auto-generated quizzes and summaries powered by OpenAI GPT
- AI tutor chat for follow-up questions
- Progress persistence per authenticated user (Firebase UID)
- Accessible UI with keyboard support for checkpoints and quizzes

## Stack
- Frontend: React (CRA), React Router, Firebase Auth
- Backend: Flask, SQLAlchemy (SQLite default), openai (GPT)
- Auth: Firebase ID tokens; server resolves user from token (no client-side userId)
- CI: GitHub Actions matrices for backend (Python 3.10–3.12) and frontend (Node 20.x, 22.x)

## Project Structure
- [client](client) – React app, services, components, and tests
- [server](server) – Flask API, routes, services, and tests
- [.github/workflows](.github/workflows) – CI for frontend/backend

## Prerequisites
- Python 3.10+ and Node 20+ (matching CI)
- OpenAI API key (`OPENAI_API_KEY`)
- Firebase project for Auth (REACT_APP_* vars)

## Setup

### Local Development
1) **Backend setup:**
```bash
cd server
cp .env_template .env
# Edit .env with your API keys and Firebase credentials
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2) **Frontend setup:**
```bash
cd client
# Create .env file with Firebase and backend config
npm install
```

3) **Environment files:**
   - Backend: [server/.env](server/.env_template) – API keys, database, Firebase admin credentials
   - Frontend: [client/.env](client/.env_template) – Firebase client config and `REACT_APP_API_URL`

## Run Locally
- **Backend:** from [server](server) directory run `python app.py` (runs on port 8080 by default, or PORT from .env)
- **Frontend:** from [client](client) directory run `npm start` (runs on port 3000, connects to backend via `REACT_APP_API_URL` or defaults to `http://localhost:5000`)

## Environment Variables

### Backend (server/.env)
- `PORT` – Server port (default: 8080 for Cloud Run, 5000 for local)
- `OPENAI_API_KEY` – OpenAI API key
- `DATABASE_URL` – Database connection (default: sqlite:///./learnflow.db)
- `FIREBASE_SERVICE_ACCOUNT_FILE` – Path to Firebase admin credentials JSON (for local)
- `FIREBASE_SERVICE_ACCOUNT_JSON` – Firebase credentials as JSON string (for production)
- `LOG_FILE` – Log file path (use /tmp/learnflow.log on Cloud Run)

### Frontend (client/.env)
- `REACT_APP_API_URL` – Backend API URL (e.g., https://your-backend.run.app)
- `REACT_APP_FIREBASE_API_KEY` – Firebase public API key
- `REACT_APP_FIREBASE_AUTH_DOMAIN` – Firebase auth domain
- `REACT_APP_FIREBASE_PROJECT_ID` – Firebase project ID
- `REACT_APP_FIREBASE_STORAGE_BUCKET` – Firebase storage bucket
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` – Firebase messaging sender ID
- `REACT_APP_FIREBASE_APP_ID` – Firebase app ID

## Testing
- Backend unit tests: from [server](server) run `pytest` (Firebase verification is mocked; OpenAI not required)
- Frontend tests: from [client](client) run `npm test`