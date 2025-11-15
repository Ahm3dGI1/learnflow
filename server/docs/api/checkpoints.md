# Checkpoint Generation API

Generate learning checkpoints from video transcripts using LearnLM.

## Endpoint

```
POST /api/llm/checkpoints/generate
```

## Description

Analyzes a video transcript and generates strategic learning checkpoints at key conceptual transitions. Checkpoints include timestamps, titles, and subtopic descriptions to help students engage with video content interactively.

## Request

### Headers
```
Content-Type: application/json
```

### Body

```json
{
  "videoId": "dQw4w9WgXcQ",
  "transcript": {
    "snippets": [
      {
        "text": "Hey there",
        "start": 0.0,
        "duration": 1.54
      },
      {
        "text": "how are you",
        "start": 1.54,
        "duration": 4.16
      }
    ],
    "language": "English",
    "languageCode": "en",
    "isGenerated": false
  },
  "options": {
    "maxCheckpoints": 8,
    "minInterval": 120
  }
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoId` | string | Yes | YouTube video ID |
| `transcript` | object | Yes | Transcript data object |
| `transcript.snippets` | array | Yes | Array of transcript snippets with text, start time, and duration |
| `transcript.language` | string | No | Full language name (e.g., "English") |
| `transcript.languageCode` | string | No | ISO language code (e.g., "en"). Default: "en" |
| `transcript.isGenerated` | boolean | No | Whether transcript is auto-generated |
| `options` | object | No | Optional configuration |
| `options.maxCheckpoints` | number | No | Maximum number of checkpoints (currently advisory) |
| `options.minInterval` | number | No | Minimum seconds between checkpoints (currently advisory) |

## Response

### Success (200 OK)

```json
{
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "cached": false,
  "checkpoints": [
    {
      "id": 1,
      "timestamp": "02:15",
      "timestampSeconds": 135,
      "title": "Photosynthesis Definition",
      "subtopic": "Understanding what photosynthesis is and why plants need it."
    },
    {
      "id": 2,
      "timestamp": "05:40",
      "timestampSeconds": 340,
      "title": "Light-Dependent Reactions",
      "subtopic": "How chlorophyll captures light energy in the thylakoid membrane."
    },
    {
      "id": 3,
      "timestamp": "08:20",
      "timestampSeconds": 500,
      "title": "Calvin Cycle Process",
      "subtopic": "Converting carbon dioxide into glucose using ATP and NADPH."
    }
  ],
  "totalCheckpoints": 3
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `videoId` | string | YouTube video ID |
| `language` | string | Language code of the video |
| `cached` | boolean | Whether result was served from cache |
| `checkpoints` | array | Array of checkpoint objects |
| `checkpoints[].id` | number | Sequential checkpoint ID (1-indexed) |
| `checkpoints[].timestamp` | string | Human-readable timestamp (MM:SS) |
| `checkpoints[].timestampSeconds` | number | Timestamp in seconds for video seeking |
| `checkpoints[].title` | string | Short checkpoint title (3-6 words) |
| `checkpoints[].subtopic` | string | Brief description of what the section covers |
| `totalCheckpoints` | number | Total number of checkpoints generated |

### Error Responses

#### 400 Bad Request
```json
{
  "error": "videoId is required"
}
```

```json
{
  "error": "transcript is required"
}
```

```json
{
  "error": "transcript.snippets is required"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to generate checkpoints",
  "details": "Error message details"
}
```

## Caching

- Checkpoints are cached **in-memory** per video and language
- Cache key format: `{videoId}:{languageCode}`
- Cache TTL: **1 hour**
- Cached responses include `"cached": true` flag
- Cache is cleared on server restart

### Clear Cache Endpoint

```
POST /api/llm/checkpoints/cache/clear
```

Returns:
```json
{
  "message": "Cache cleared",
  "clearedItems": 5
}
```

## Health Check

```
GET /api/llm/health
```

Returns:
```json
{
  "status": "ok",
  "cacheSize": 3
}
```

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/llm/checkpoints/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "dQw4w9WgXcQ",
    "transcript": {
      "snippets": [
        {"text": "Welcome to this video", "start": 0.0, "duration": 2.0},
        {"text": "about photosynthesis", "start": 2.0, "duration": 2.0}
      ],
      "language": "English",
      "languageCode": "en"
    }
  }'
```

### Using JavaScript (Frontend)

```javascript
async function generateCheckpoints(videoId, transcript) {
  const response = await fetch('http://localhost:5000/api/llm/checkpoints/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      videoId,
      transcript
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return await response.json();
}

// Usage
const checkpoints = await generateCheckpoints('dQw4w9WgXcQ', transcriptData);
console.log(checkpoints);
```

### Using Python

```python
import requests

def generate_checkpoints(video_id, transcript_data):
    url = 'http://localhost:5000/api/llm/checkpoints/generate'
    payload = {
        'videoId': video_id,
        'transcript': transcript_data
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    return response.json()

# Usage
checkpoints = generate_checkpoints('dQw4w9WgXcQ', transcript_data)
print(checkpoints)
```

## Implementation Details

### Checkpoint Generation Process

1. **Transcript Formatting**: Snippets are formatted with timestamps
   ```
   [00:00] Hey there
   [00:01] how are you
   [00:05] today we'll learn about...
   ```

2. **LLM Prompt**: Formatted transcript sent to LearnLM with instructions

3. **JSON Parsing**: LLM response parsed and validated

4. **Timestamp Conversion**: MM:SS timestamps converted to seconds

5. **Response Enrichment**: IDs added, data structured for frontend

### Checkpoint Criteria

Checkpoints are placed at moments that:
- Mark new concepts or subtopics
- Represent key conceptual transitions
- Are spaced appropriately (typically 90-120 seconds apart)
- Skip introductions/outros unless substantial
- Focus on crucial understanding points

### Number of Checkpoints

- Short videos (< 5 min): 3-5 checkpoints
- Medium videos (5-15 min): 5-7 checkpoints
- Long videos (> 15 min): 6-8 checkpoints

## Performance

- **Average response time**: 5-15 seconds (depends on video length)
- **Cache hit**: < 100ms
- **Recommended**: Show loading indicator during generation

## Error Handling

```javascript
try {
  const checkpoints = await generateCheckpoints(videoId, transcript);
  // Use checkpoints
} catch (error) {
  if (error.message.includes('overloaded')) {
    // Retry after delay
    setTimeout(() => generateCheckpoints(videoId, transcript), 3000);
  } else {
    // Show error to user
    console.error('Failed to generate checkpoints:', error);
  }
}
```

## Notes

- First request for a video will be slower (5-15 seconds)
- Subsequent requests for the same video are instant (cached)
- Large transcripts may hit token limits (future: chunking)
- Requires `GEMINI_API_KEY` in environment variables

## Future Enhancements

- [ ] Persistent caching (Redis)
- [ ] Transcript chunking for long videos
- [ ] User-specific checkpoint customization
- [ ] Checkpoint editing/refinement
- [ ] Multi-language optimization
- [ ] Rate limiting per user
