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

### Running the Server

```bash
python app.py
```

Server runs on `http://localhost:5000` (configurable via .env file)

## Endpoints

### GET /api/quiz/:id
Get a quiz by ID (mock data for now)

### POST /api/quiz/generate
Generate quiz from video transcript
```json
{
  "transcript": "video text here",
  "videoId": "optional-video-id"
}
```

### POST /api/quiz/submit
Submit quiz answers
```json
{
  "quizId": "123",
  "answers": [0, 1, 2, 3]
}
```

## TODO
- [ ] Integrate OpenAI API for actual quiz generation
- [ ] Add database for storing quizzes
- [ ] Add user authentication
