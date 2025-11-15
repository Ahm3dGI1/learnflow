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

---

### Coming Soon

#### Chat API (Planned)
Conversational AI tutoring for video content.

- **Endpoint:** `POST /api/llm/chat/message`
- **Purpose:** Interactive Q&A with context-aware AI tutor
- **Status:** Planned for next PR

#### Quiz API v2 (Planned)
LLM-powered quiz generation from video content.

- **Endpoint:** `POST /api/llm/quiz/generate`
- **Purpose:** Generate adaptive quizzes from transcript subtopics
- **Status:** Planned (current quiz endpoints use mock data)

---

## Authentication

Currently, all endpoints are public. Authentication will be added in future updates.

**Planned:**
- Firebase JWT token authentication
- User-specific rate limiting
- Progress tracking per user

## Rate Limiting

**Current:** None

**Planned:**
- 100 requests per hour per IP
- 50 LLM generations per day per user
- Cached responses don't count toward limits

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
| 401 | Unauthorized | Missing/invalid authentication (future) |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded (future) |
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

### Current Version (v1.0)

**Added:**
- Checkpoint generation API
- In-memory caching system
- Health check endpoints

**Coming Next:**
- Chat/tutoring API
- Quiz generation v2 with LLM
- User authentication
- Rate limiting
