# LearnFlow API Documentation

Complete documentation for all LearnFlow API endpoints.

## Base URL

```
http://localhost:5000
```

## Available APIs

### LLM Services

AI-powered educational features using Google's LearnLM model.

#### [Checkpoints API](./checkpoints.md)
Generate learning checkpoints from video transcripts at key conceptual transitions.

- **Endpoint:** `POST /api/llm/checkpoints/generate`
- **Purpose:** Analyze video content and create strategic learning checkpoints
- **Caching:** 1-hour TTL
- **Documentation:** [Full Details](./checkpoints.md)

**Quick Example:**
```bash
curl -X POST http://localhost:5000/api/llm/checkpoints/generate \
  -H "Content-Type: application/json" \
  -d '{"videoId": "abc123", "transcript": {...}}'
```

#### [Chat API](./chat.md)
Conversational AI tutoring with Socratic questioning.

- **Endpoints:** 
  - `POST /api/llm/chat/send` - Standard response
  - `POST /api/llm/chat/stream` - Streaming response
- **Purpose:** Interactive Q&A with context-aware AI tutor using video content
- **Caching:** No caching (each conversation is unique)
- **Documentation:** [Full Details](./chat.md)

**Quick Example:**
```bash
curl -X POST http://localhost:5000/api/llm/chat/send \
  -H "Content-Type: application/json" \
  -d '{"message": "Why does this happen?", "videoContext": {...}}'
```

#### [Quiz API](./quiz.md)
AI-powered multiple choice quiz generation from video transcripts.

- **Endpoints:**
  - `POST /api/llm/quiz/generate` - Generate quiz questions
  - `POST /api/llm/quiz/cache/clear` - Clear quiz cache
- **Purpose:** Generate multiple choice questions testing video content understanding
- **Caching:** 1-hour TTL
- **Documentation:** [Full Details](./quiz.md)

**Quick Example:**
```bash
curl -X POST http://localhost:5000/api/llm/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{"videoId": "abc123", "transcript": {...}, "numQuestions": 5}'
```

---

## Authentication

All LLM endpoints require Firebase JWT token authentication.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
```

**Features:**
- Firebase JWT token verification
- User-specific rate limiting
- Progress tracking per user

## Rate Limiting

Rate limiting is implemented for LLM endpoints to prevent abuse.

**Current Limits:**
- **User-scoped endpoints**: 30 requests per minute per user
- **Video-scoped endpoints**: 10 requests per minute per video
- Cached responses don't count toward limits

**Rate Limit Response (429):**
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

## Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Brief error message",
  "details": "Detailed error information (optional)"
}
```

### Common Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing/invalid Firebase token |
| 403 | Forbidden | User not authorized for this resource |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | LLM overloaded, retry later |

## Response Format

All successful responses return JSON:

```json
{
  "data": {...},
  "metadata": {...},
  "cached": false
}
```

## Caching

Many endpoints implement caching to improve performance and reduce LLM costs:

- **Cache Type:** In-memory (per-server)
- **Cache Key:** Resource-specific (e.g., `videoId:language`)
- **TTL:** Varies by endpoint (typically 1 hour)
- **Cache Indicator:** `"cached": true` in response

### Cache Management

Clear cache for testing:
```bash
POST /api/llm/checkpoints/cache/clear
```

## Health Checks

Check service status:

```bash
GET /api/llm/health
```

Response:
```json
{
  "status": "ok",
  "cacheSize": 3
}
```

## Best Practices

### Request Guidelines

1. **Content-Type:** Always use `application/json`
2. **Validation:** Check required fields before sending
3. **Error Handling:** Implement retry logic for 503 errors
4. **Timeouts:** Set request timeout to 30 seconds for LLM endpoints

### Performance Tips

1. **Cache responses** on frontend when possible
2. **Show loading indicators** for LLM generation (5-15 seconds)
3. **Implement retry logic** with exponential backoff for failures
4. **Check cache status** - display "instant" badge for cached responses

### Example Client Code

```javascript
async function callAPI(endpoint, data) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      timeout: 30000
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    return await response.json();
  } catch (error) {
    if (error.message.includes('overloaded')) {
      // Retry after delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      return callAPI(endpoint, data);
    }
    throw error;
  }
}
```

## Development

### Running the Server

```bash
cd server
python app.py
```

Server starts on `http://localhost:5000`

### Environment Variables

Required in `.env`:
```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_NAME=learnlm-2.0-flash-experimental
PORT=5000
```

### Testing Endpoints

Use tools like:
- cURL (command line)
- Postman (GUI)
- Thunder Client (VS Code extension)
- Python requests library

## Support

For issues or questions:
- Check endpoint-specific documentation
- Review error messages and status codes
- Verify environment configuration
- Check LLM client documentation: [../llm/README.md](../llm/README.md)

## Changelog

### Current Version (v2.0)

**Added:**
- Firebase JWT authentication on selected LLM endpoints (chat, quiz submission, quiz attempts, checkpoint progress)
- Rate limiting (user-scoped and video-scoped)
- Chat/tutoring API with streaming support
- Quiz generation with LLM
- Video summary generation
- Video history tracking
- Quiz attempt history
- YouTube Data API fallback for transcript fetching

### Previous Version (v1.0)

**Added:**
- Checkpoint generation API
- In-memory caching system
- Health check endpoints
