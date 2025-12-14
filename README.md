# LearnFlow

Interactive, AI-assisted learning from YouTube videos. LearnFlow fetches transcripts, generates checkpoints and quizzes with Gemini, and tracks learner progress with Firebase-authenticated users.

## Features
- Checkpoints on the video timeline with completion tracking
- Auto-generated quizzes and summaries powered by Google Gemini
- AI tutor chat for follow-up questions
- Progress persistence per authenticated user (Firebase UID)
- Accessible UI with keyboard support for checkpoints and quizzes

## Stack
- Frontend: React (CRA), React Router, Firebase Auth
- Backend: Flask, SQLAlchemy (SQLite default), google-genai (Gemini)
- Auth: Firebase ID tokens; server resolves user from token (no client-side userId)
- CI: GitHub Actions matrices for backend (Python 3.10–3.12) and frontend (Node 20.x, 22.x)

## Project Structure
- [client](client) – React app, services, components, and tests
- [server](server) – Flask API, routes, services, and tests
- [.github/workflows](.github/workflows) – CI for frontend/backend

## Prerequisites
- Python 3.10+ and Node 20+ (matching CI)
- Google Gemini API key (`GEMINI_API_KEY`)
- Firebase project for Auth (REACT_APP_* vars)

## Setup
1) Copy env template and fill values:
```
cp .env_template .env
```
2) Backend deps:
```
cd server
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```
3) Frontend deps:
```
cd client
npm install
```

## Run Locally
- Backend: from [server](server) run `python app.py` (PORT from .env, default 5000)
- Frontend: from [client](client) run `npm start` (requires REACT_APP_* vars); proxies to backend at `http://localhost:5000` by default

## Environment Variables
Defined in [.env_template](.env_template):
- Backend: `PORT`, `GEMINI_API_KEY`, `GEMINI_MODEL_NAME`, `DATABASE_URL` (SQLite default), optional `FIREBASE_SERVICE_ACCOUNT_FILE` or `FIREBASE_SERVICE_ACCOUNT_JSON`
- Frontend: `REACT_APP_API_BASE_URL`, `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`

## Testing
- Backend unit tests: from [server](server) run `pytest` (Firebase verification is mocked; Gemini not required)
- Frontend tests: from [client](client) run `npm test`

## Docs
- Backend details: [server/README.md](server/README.md)
- API docs: [server/docs/api/README.md](server/docs/api/README.md) and related files