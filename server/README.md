# LearnFlow Server

Simple Flask backend for quiz generation and AI-powered learning.

## Setup

```bash
cd server
pip install -r requirements.txt
```

### Environment Variables

Copy `.env_template` to `.env` and fill in the required values:

```bash
cp ../.env_template ../.env
```

Required environment variables:
- `PORT` - Server port (default: 5000)
- `GEMINI_API_KEY` - Google AI API key for LearnLM integration ([Get your API key](https://aistudio.google.com/apikey))
- `GEMINI_MODEL_NAME` - LearnLM model name (default: `learnlm-2.0-flash-experimental`)

Additional optional environment variables for Firebase Admin (verification):
- `FIREBASE_SERVICE_ACCOUNT_FILE` - Path to your Firebase service account JSON credentials.
- `FIREBASE_SERVICE_ACCOUNT_JSON` - JSON string representing the Firebase service account credentials; useful for CI secrets.

Notes:
- Unit tests in `server/tests` mock Firebase token verification and do not require a service account to run.
- For local dev with real verification enabled, provide `FIREBASE_SERVICE_ACCOUNT_FILE` or set `FIREBASE_SERVICE_ACCOUNT_JSON`.

### Running the Server

```bash
python app.py
```

Server runs on `http://localhost:5000` (configurable via .env file)

## Endpoints

### LLM Endpoints (`/api/llm/*`)
AI-powered learning features using Google's LearnLM model.

- `POST /api/llm/checkpoints/generate` - Generate learning checkpoints
- `POST /api/llm/quiz/generate` - Generate quiz questions
- `POST /api/llm/chat/stream` - AI tutoring chat (streaming)
- `POST /api/llm/summary/generate` - Generate video summary
- `GET /api/llm/health` - Health check

### Video Endpoints (`/api/videos/*`)
Video metadata and transcript management.

- `POST /api/videos/transcript` - Fetch video transcript
- `GET /api/videos/history/{uid}` - Get user's video history
- `POST /api/videos/history/{uid}` - Add video to history
- `DELETE /api/videos/history/{uid}/{videoId}` - Remove from history

### User Endpoints (`/api/users/*`)
User management with Firebase authentication.

- `GET /api/users/me` - Get current user profile
- `POST /api/users` - Create/update user

### Progress Endpoints (`/api/progress/*`)
Track user learning progress.

- `GET /api/progress/users/{firebase_uid}/videos/{video_id}` - Get progress for a specific video
- `POST /api/progress/users/{firebase_uid}/videos/{video_id}` - Update progress for a specific video
- `PUT /api/progress/users/{firebase_uid}/videos/{video_id}/complete` - Mark video as complete
- `GET /api/progress/users/{firebase_uid}` - Get all progress for user

**Full API Documentation:** [docs/api/README.md](docs/api/README.md)
