# LearnFlow Server

Simple backend for quiz generation.

## Setup

```bash
cd server
npm install
npm run dev
```

Server runs on `http://localhost:5000`

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
