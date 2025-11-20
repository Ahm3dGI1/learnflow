# Chat API

AI-powered tutoring through conversational interaction using LearnLM.

## Endpoints

### POST /api/llm/chat/send

Send a message to the AI tutor and receive a response.

#### Description

Enables students to ask questions and receive Socratic-style tutoring responses. The AI tutor uses video context to provide relevant guidance and asks thought-provoking questions rather than giving direct answers.

#### Request

**Headers**
```
Content-Type: application/json
```

**Body**
```json
{
  "message": "I don't understand why photosynthesis needs light",
  "videoContext": {
    "videoId": "dQw4w9WgXcQ",
    "transcriptSnippet": "Light energy is captured by chlorophyll...",
    "language": "en"
  },
  "timestamp": "05:30"
}
```

**Parameters**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | Student's question or message |
| `videoContext` | object | Yes | Context about the video being watched |
| `videoContext.videoId` | string | Yes | YouTube video ID |
| `videoContext.transcriptSnippet` | string | No | Relevant portion of transcript for context |
| `videoContext.language` | string | No | Language code (default: "en") |
| `timestamp` | string | No | Current video timestamp (MM:SS format) |

#### Response

**Success (200 OK)**
```json
{
  "response": "That's a great question! Think about what chlorophyll does when light hits it. What do you think happens to that energy? Look back at timestamp 05:15 where we discussed energy conversion.",
  "videoId": "dQw4w9WgXcQ",
  "timestamp": "05:30"
}
```

**Response Fields**

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI tutor's response using Socratic questioning |
| `videoId` | string | Video ID from request |
| `timestamp` | string | Timestamp from request |

**Error Responses**

400 Bad Request
```json
{
  "error": "message is required"
}
```

500 Internal Server Error
```json
{
  "error": "Failed to generate chat response",
  "details": "Error description"
}
```

#### Example Usage

**Python**
```python
import requests

url = "http://localhost:5000/api/llm/chat/send"
payload = {
    "message": "What is the difference between the light and dark reactions?",
    "videoContext": {
        "videoId": "abc123",
        "transcriptSnippet": "The light reactions occur in the thylakoid...",
        "language": "en"
    },
    "timestamp": "08:45"
}

response = requests.post(url, json=payload)
print(response.json()['response'])
```

**JavaScript (fetch)**
```javascript
const response = await fetch('http://localhost:5000/api/llm/chat/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Can you explain why water is split?",
    videoContext: {
      videoId: "abc123",
      transcriptSnippet: "Water molecules are split...",
      language: "en"
    },
    timestamp: "10:20"
  })
});

const data = await response.json();
console.log(data.response);
```

**cURL**
```bash
curl -X POST http://localhost:5000/api/llm/chat/send \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Why do plants appear green?",
    "videoContext": {
      "videoId": "abc123",
      "transcriptSnippet": "Chlorophyll reflects green light...",
      "language": "en"
    },
    "timestamp": "03:15"
  }'
```

---

### POST /api/llm/chat/stream

Send a message and receive a streaming response (for real-time UI updates).

#### Description

Same as `/chat/send` but returns a streaming text response, allowing the frontend to display the AI tutor's response as it's being generated.

#### Request

Same as `/chat/send`

#### Response

**Success (200 OK)**

Returns `text/plain` stream with chunks of text as they're generated.

#### Example Usage

**Python**
```python
import requests

url = "http://localhost:5000/api/llm/chat/stream"
payload = {
    "message": "What happens in the Calvin Cycle?",
    "videoContext": {
        "videoId": "abc123",
        "language": "en"
    }
}

response = requests.post(url, json=payload, stream=True)

for chunk in response.iter_content(chunk_size=None, decode_unicode=True):
    if chunk:
        print(chunk, end='', flush=True)
```

**JavaScript (EventSource alternative)**
```javascript
const response = await fetch('http://localhost:5000/api/llm/chat/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Explain ATP production",
    videoContext: { videoId: "abc123" }
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {value, done} = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  console.log(chunk);
  // Update UI with chunk
}
```

---

## Tutoring Philosophy

The AI tutor follows these principles:

1. **Socratic Method**: Asks questions to guide learning rather than providing direct answers
2. **Context-Aware**: References specific timestamps and content from the video
3. **Progressive Guidance**: Starts with hints, provides more help if student is stuck
4. **Encouraging**: Acknowledges progress and understanding
5. **Focused**: Keeps responses concise (30-45 seconds of speech)

## Best Practices

### Providing Context

Always include relevant `transcriptSnippet` for better responses:

```json
{
  "message": "Why does this happen?",
  "videoContext": {
    "videoId": "abc123",
    "transcriptSnippet": "The last 2-3 sentences from the video transcript",
    "language": "en"
  },
  "timestamp": "current-timestamp"
}
```

### Handling Responses

The tutor may:
- Ask follow-up questions
- Reference specific timestamps to rewatch
- Break down complex concepts
- Provide hints rather than full answers

### Error Handling

```python
try:
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    return data['response']
except requests.exceptions.Timeout:
    return "Request timed out. Please try again."
except requests.exceptions.RequestException as e:
    return f"Error: {str(e)}"
```

## Performance Notes

- **Response Time**: 5-15 seconds for typical queries
- **No Caching**: Each conversation is unique, responses are not cached
- **Context Window**: Keep transcript snippets under 2000 characters for best performance
- **Rate Limiting**: Consider implementing rate limits for production use

## Integration with Video Player

Recommended workflow:

1. Student pauses video at timestamp
2. Student asks question with current context
3. Display tutor response in chat interface
4. Tutor references specific timestamps student can jump to
5. Student can rewatch referenced sections

## Common Use Cases

### Clarification Questions
```json
{
  "message": "Can you explain that last part again?",
  "videoContext": {
    "videoId": "abc123",
    "transcriptSnippet": "Recent transcript...",
    "language": "en"
  },
  "timestamp": "current-time"
}
```

### Conceptual Understanding
```json
{
  "message": "How does this relate to what we learned earlier?",
  "videoContext": {
    "videoId": "abc123",
    "transcriptSnippet": "Current section...",
    "language": "en"
  }
}
```

### Application Questions
```json
{
  "message": "Where would I see this in real life?",
  "videoContext": {
    "videoId": "abc123",
    "language": "en"
  }
}
```
