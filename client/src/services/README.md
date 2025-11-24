---
noteId: "76bed020c87911f0bd6721e16f4e1493"
tags: []

---

# LearnFlow API Services

Centralized API client and service layer for frontend-backend communication.

## Overview

This directory contains all the service modules for interacting with the LearnFlow backend API. The services handle authentication, error handling, retries, and provide a clean interface for making API calls.

## Architecture

```
services/
├── api.js              # Core API client with auth & error handling
├── videoService.js     # Video and transcript operations
├── llmService.js       # AI/LLM operations (checkpoints, quiz, chat)
├── testApiIntegration.js  # Test suite for API integration
└── index.js            # Exports all services
```

---

## Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:5000
```

### 2. Import Services

```javascript
// Import all services
import { api, videoService, llmService, ApiError } from './services';

// Or import individually
import api from './services/api';
import videoService from './services/videoService';
import llmService from './services/llmService';
```

---

## Core API Client (`api.js`)

The base API client handles all HTTP requests with automatic authentication.

### Features

- **Automatic Firebase Auth**: Attaches Firebase ID token to all requests
- **Error Handling**: Converts HTTP errors to `ApiError` objects
- **Retry Logic**: Exponential backoff for failed requests
- **Request/Response Interceptors**: Centralized logging and transformation

### Usage

```javascript
import api from './services/api';

// GET request
const data = await api.get('/api/endpoint');

// POST request (with auth)
const result = await api.post('/api/endpoint', { key: 'value' });

// POST request (no auth required)
const result = await api.post('/api/endpoint', { key: 'value' }, {}, false);

// With retry
const data = await api.retry(() => api.get('/api/endpoint'), 3, 1000);
```

### Error Handling

```javascript
import { ApiError } from './services';

try {
  const data = await api.get('/api/endpoint');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('Status:', error.status);
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
  }
}
```

---

## Video Service (`videoService.js`)

Handles video transcript fetching and video metadata operations.

### Methods

#### `fetchTranscript(videoId, languageCodes?)`

Fetch transcript for a YouTube video.

```javascript
import videoService from './services/videoService';

const transcript = await videoService.fetchTranscript('dQw4w9WgXcQ', ['en']);
// Returns:
// {
//   videoId: 'dQw4w9WgXcQ',
//   snippets: [{ text, start, duration }, ...],
//   language: 'English',
//   languageCode: 'en',
//   isGenerated: false,
//   fetchedAt: '2025-01-22T10:30:00Z',
//   durationSeconds: 213
// }
```

#### `listAvailableTranscripts(videoId)`

Get all available transcript languages.

```javascript
const available = await videoService.listAvailableTranscripts('dQw4w9WgXcQ');
// Returns:
// {
//   videoId: 'dQw4w9WgXcQ',
//   transcripts: [
//     { languageCode: 'en', language: 'English', isGenerated: false, isTranslatable: true },
//     { languageCode: 'es', language: 'Spanish', isGenerated: true, isTranslatable: true }
//   ]
// }
```

#### `extractVideoId(url)`

Extract video ID from YouTube URL.

```javascript
const { videoId } = await videoService.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// Returns: { videoId: 'dQw4w9WgXcQ', url: 'https://...' }
```

#### `getVideoData(urlOrId, languageCodes?)`

Convenience method to extract ID and fetch transcript in one call.

```javascript
const { videoId, transcript } = await videoService.getVideoData(
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
);
```

#### `saveProgress(videoId, currentPosition, isCompleted)` 🔐

Save user's video watch progress (requires auth).

```javascript
await videoService.saveProgress('dQw4w9WgXcQ', 125.5, false);
```

#### `getHistory()` 🔐

Get user's video watch history (requires auth).

```javascript
const history = await videoService.getHistory();
// Returns: { videos: [{ videoId, title, thumbnailUrl, currentPosition, duration, ... }] }
```

### Utility Methods

```javascript
// Get thumbnail URL
const thumbnailUrl = videoService.getThumbnailUrl('dQw4w9WgXcQ', 'high');

// Get YouTube video URL
const videoUrl = videoService.getVideoUrl('dQw4w9WgXcQ', 30); // Start at 30s

// Format transcript to text
const fullText = videoService.formatTranscriptText(transcript.snippets);

// Format timestamp (seconds → "2:30")
const timestamp = videoService.formatTimestamp(150); // "2:30"

// Search transcript
const matches = videoService.searchTranscript(transcript.snippets, 'neural network');
```

---

## LLM Service (`llmService.js`)

Handles AI-powered features: checkpoints, quizzes, and chat.

### Methods

#### `generateCheckpoints(transcript, options?)`

Generate learning checkpoints from transcript.

```javascript
import llmService from './services/llmService';

const checkpoints = await llmService.generateCheckpoints(transcript, {
  numCheckpoints: 5,
  difficulty: 'intermediate',
});
// Returns:
// {
//   checkpoints: [
//     { timestamp: 0, title: 'Introduction', description: '...', keyPoints: [...] },
//     { timestamp: 150, title: 'Core Concept', description: '...', keyPoints: [...] }
//   ],
//   generatedAt: '2025-01-22T10:30:00Z'
// }
```

**Options:**
- `numCheckpoints` (number): Number of checkpoints to generate (default: 5)
- `difficulty` (string): 'beginner', 'intermediate', 'advanced' (default: 'intermediate')

#### `generateQuiz(transcript, options?)`

Generate quiz questions from transcript.

```javascript
const quiz = await llmService.generateQuiz(transcript, {
  numQuestions: 5,
  difficulty: 'intermediate',
  questionType: 'multiple_choice',
});
// Returns:
// {
//   quizId: 'quiz_123',
//   questions: [
//     {
//       question: 'What is...?',
//       options: ['A', 'B', 'C', 'D'],
//       correctAnswer: 'B',
//       explanation: '...'
//     }
//   ],
//   generatedAt: '2025-01-22T10:30:00Z'
// }
```

**Options:**
- `numQuestions` (number): Number of questions (default: 5)
- `difficulty` (string): 'beginner', 'intermediate', 'advanced'
- `questionType` (string): 'multiple_choice', 'true_false', 'mixed'

#### `sendChatMessage(message, context)`

Send a message to AI tutor.

```javascript
const response = await llmService.sendChatMessage('Explain this concept in simple terms', {
  videoId: 'dQw4w9WgXcQ',
  transcript: transcript,
  sessionId: 'session_123', // Optional
});
// Returns:
// {
//   response: 'Here is the explanation...',
//   sessionId: 'session_123',
//   timestamp: '2025-01-22T10:30:00Z'
// }
```

#### `sendChatMessageStream(message, context, onChunk)`

Send a message with streaming response.

```javascript
const fullResponse = await llmService.sendChatMessageStream(
  'Explain neural networks',
  { videoId: 'abc123', transcript },
  (chunk) => {
    // Update UI with each chunk
    console.log('Received chunk:', chunk);
  }
);
```

#### `completeCheckpoint(checkpointId)` 🔐

Mark a checkpoint as complete (requires auth).

```javascript
await llmService.completeCheckpoint('checkpoint_123');
```

#### `submitQuiz(quizId, answers)` 🔐

Submit quiz answers and get results (requires auth).

```javascript
const results = await llmService.submitQuiz('quiz_123', [
  { questionId: 1, selectedAnswer: 'B' },
  { questionId: 2, selectedAnswer: 'A' },
]);
// Returns:
// {
//   attemptId: 456,
//   score: 80,
//   totalQuestions: 5,
//   correctAnswers: 4,
//   answers: [{ questionId, selectedAnswer, correctAnswer, isCorrect }, ...]
// }
```

### Cache Management

```javascript
// Clear checkpoint cache
await llmService.clearCheckpointCache('dQw4w9WgXcQ');

// Clear quiz cache
await llmService.clearQuizCache('dQw4w9WgXcQ');
```

### Health Check

```javascript
const health = await llmService.healthCheck();
// Returns: { status: 'ok', gemini_model: 'learnlm-2.0-flash-experimental' }
```

---

## Testing

### Run Integration Tests

```javascript
import { runAllTests } from './services/testApiIntegration';

// Run all tests
const results = await runAllTests();

// Run individual tests
import {
  testHealthCheck,
  testTranscriptFetch,
  testCheckpointGeneration,
} from './services/testApiIntegration';

await testHealthCheck();
await testTranscriptFetch();
```