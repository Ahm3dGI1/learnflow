# Backend Integration Guide

This document outlines the API endpoints and data structures expected by the frontend for backend integration.

## Authentication

### POST /api/auth/register
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

### POST /api/auth/login
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "token": "jwt-token-here"
}
```

### GET /api/auth/me
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "user-123",
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Videos

### GET /api/videos
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "video-123",
    "title": "Introduction to React",
    "description": "Learn React fundamentals",
    "url": "https://www.youtube.com/watch?v=...",
    "youtubeUrl": "https://www.youtube.com/watch?v=...",
    "thumbnail": "https://img.youtube.com/vi/.../maxresdefault.jpg",
    "duration": 1800,
    "createdAt": "2024-01-01T00:00:00Z",
    "checkpoints": [],
    "transcript": null
  }
]
```

### GET /api/videos/:id
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "video-123",
  "title": "Introduction to React",
  "description": "Learn React fundamentals",
  "url": "https://www.youtube.com/watch?v=...",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "thumbnail": "https://img.youtube.com/vi/.../maxresdefault.jpg",
  "duration": 1800,
  "createdAt": "2024-01-01T00:00:00Z",
  "checkpoints": [
    {
      "id": "cp-123",
      "videoId": "video-123",
      "timestamp": 60,
      "type": "multiple_choice",
      "question": "What is React?",
      "options": ["A library", "A framework", "A language", "A tool"],
      "correctAnswer": "A library",
      "explanation": "React is a JavaScript library for building user interfaces.",
      "required": true
    }
  ],
  "transcript": "Full video transcript here..."
}
```

### POST /api/videos
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Introduction to React",
  "description": "Learn React fundamentals",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "videoId": "extracted-video-id",
  "type": "youtube"
}
```

**Response:**
```json
{
  "id": "video-123",
  "title": "Introduction to React",
  "description": "Learn React fundamentals",
  "url": "https://www.youtube.com/watch?v=...",
  "youtubeUrl": "https://www.youtube.com/watch?v=...",
  "thumbnail": "https://img.youtube.com/vi/.../maxresdefault.jpg",
  "duration": 1800,
  "createdAt": "2024-01-01T00:00:00Z",
  "checkpoints": [],
  "transcript": null
}
```

## Progress Tracking

### GET /api/videos/:id/progress
**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "videoId": "video-123",
  "userId": "user-123",
  "currentTime": 120,
  "completedCheckpoints": ["cp-123"],
  "lastWatched": "2024-01-01T00:00:00Z",
  "completed": false
}
```

### PUT /api/videos/:id/progress
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "currentTime": 120
}
```

**Response:**
```json
{
  "videoId": "video-123",
  "userId": "user-123",
  "currentTime": 120,
  "completedCheckpoints": ["cp-123"],
  "lastWatched": "2024-01-01T00:00:00Z",
  "completed": false
}
```

## Checkpoints

### PUT /api/videos/:id/checkpoints
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "checkpoints": [
    {
      "id": "cp-123",
      "videoId": "video-123",
      "timestamp": 60,
      "type": "multiple_choice",
      "question": "What is React?",
      "options": ["A library", "A framework", "A language", "A tool"],
      "correctAnswer": "A library",
      "explanation": "React is a JavaScript library for building user interfaces.",
      "required": true
    }
  ]
}
```

**Response:**
```json
{
  "id": "video-123",
  "checkpoints": [...]
}
```

### POST /api/checkpoints/:id/validate
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "answer": "A library"
}
```

**Response:**
```json
{
  "correct": true,
  "explanation": "React is a JavaScript library for building user interfaces."
}
```

## AI Tutor

### POST /api/tutor/chat
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "videoId": "video-123",
  "message": "What is React?",
  "context": "Video transcript and user's learning history"
}
```

**Response:**
```json
{
  "id": "msg-123",
  "role": "assistant",
  "content": "React is a JavaScript library...",
  "timestamp": "2024-01-01T00:00:00Z",
  "audioUrl": null
}
```

## Study Materials

### POST /api/study-materials/generate
**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "videoId": "video-123",
  "type": "quiz"
}
```

**Response:**
```json
{
  "id": "material-123",
  "videoId": "video-123",
  "type": "quiz",
  "content": {
    "questions": [
      {
        "question": "What is React?",
        "options": ["A library", "A framework", "A language", "A tool"],
        "correctAnswer": 0,
        "explanation": "React is a JavaScript library for building user interfaces."
      }
    ]
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## TypeScript Types

All types are defined in `/types/index.ts`. The backend should match these types:

```typescript
interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
}

interface Video {
  id: string
  title: string
  description: string
  url: string
  youtubeUrl?: string
  thumbnail?: string
  duration: number
  createdAt: string
  checkpoints: Checkpoint[]
  transcript?: string
}

interface Checkpoint {
  id: string
  videoId: string
  timestamp: number
  type: 'multiple_choice' | 'open_ended' | 'true_false'
  question: string
  options?: string[]
  correctAnswer?: string | string[]
  explanation?: string
  required: boolean
}

interface VideoProgress {
  videoId: string
  userId: string
  currentTime: number
  completedCheckpoints: string[]
  lastWatched: string
  completed: boolean
}
```

## Environment Variables

The frontend expects:
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: `http://localhost:3001/api`)

## Current Implementation

The frontend currently uses localStorage for data persistence. To switch to the backend:

1. Set `USE_LOCAL_STORAGE = false` in `/lib/api.ts`
2. Ensure backend implements all endpoints above
3. Update `NEXT_PUBLIC_API_URL` in `.env.local`

## Notes for Backend Team

1. **Authentication**: Use JWT tokens. Store token in `Authorization: Bearer <token>` header.
2. **CORS**: Ensure CORS is enabled for the frontend domain.
3. **Error Handling**: Return errors in format: `{ message: "Error message" }`
4. **Video Processing**: Videos submitted via POST /api/videos should be processed asynchronously (transcription, checkpoint generation, etc.)
5. **Video Player**: The frontend has a placeholder for the video player. Backend team should integrate React Player or similar.
6. **AI Features**: AI tutor, checkpoint generation, and study material generation should be implemented as backend services.




