# YouTube Transcript API Documentation

## Overview

The YouTube Transcript API provides endpoints for fetching and managing video transcripts. This service enables LearnFlow to retrieve transcripts from YouTube videos for AI-powered features like checkpoints, quizzes, and summaries.

## Features

- **Multiple URL Format Support**: Accepts YouTube video IDs or full URLs (youtube.com/watch, youtu.be, embed, etc.)
- **Language Preference**: Support for multiple language codes with intelligent fallback
- **Manual & Auto-Generated Transcripts**: Prioritizes manually created transcripts, falls back to auto-generated
- **Transcript Discovery**: List all available transcript languages for any video
- **Duration Calculation**: Automatically calculates video duration from transcript data
- **Comprehensive Error Handling**: Detailed error responses for debugging

---

## API Endpoints

### 1. Fetch Transcript

Retrieves the transcript for a YouTube video with optional language preferences.

**Endpoint:** `POST /api/videos/transcript`

**Request Body:**
```json
{
  "videoId": "dQw4w9WgXcQ",           // Required: YouTube video ID or full URL
  "languageCodes": ["en", "es"]       // Optional: Preferred language codes
}
```

**Response (200 OK):**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "snippets": [
    {
      "text": "We're no strangers to love",
      "start": 0.0,
      "duration": 2.5
    },
    {
      "text": "You know the rules and so do I",
      "start": 2.5,
      "duration": 2.8
    }
  ],
  "language": "English",
  "languageCode": "en",
  "isGenerated": false,
  "fetchedAt": "2025-01-22T13:30:00Z",
  "durationSeconds": 213
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoId` | string | Yes | YouTube video ID (11 characters) or full YouTube URL |
| `languageCodes` | array | No | List of preferred language codes (e.g., `["en", "es"]`). If omitted, returns the default transcript. |

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `videoId` | string | The extracted 11-character video ID |
| `snippets` | array | Array of transcript segments with text, start time, and duration |
| `language` | string | Full language name (e.g., "English") |
| `languageCode` | string | ISO language code (e.g., "en") |
| `isGenerated` | boolean | `true` if auto-generated, `false` if manually created |
| `fetchedAt` | string | ISO 8601 timestamp of when the transcript was fetched |
| `durationSeconds` | integer | Total video duration in seconds |

**Example Usage:**

```javascript
// Fetch with video ID
const response = await fetch('http://localhost:5000/api/videos/transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'dQw4w9WgXcQ'
  })
});

// Fetch with full URL and language preference
const response = await fetch('http://localhost:5000/api/videos/transcript', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    languageCodes: ['en', 'es']
  })
});

const transcript = await response.json();
console.log(`Found ${transcript.snippets.length} transcript segments`);
```

---

### 2. List Available Transcripts

Retrieves metadata about all available transcripts for a video without fetching the full content.

**Endpoint:** `POST /api/videos/transcript/available`

**Request Body:**
```json
{
  "videoId": "aircAruvnKk"
}
```

**Response (200 OK):**
```json
{
  "videoId": "aircAruvnKk",
  "transcripts": [
    {
      "languageCode": "en",
      "language": "English",
      "isGenerated": false,
      "isTranslatable": true
    },
    {
      "languageCode": "es",
      "language": "Spanish",
      "isGenerated": true,
      "isTranslatable": true
    },
    {
      "languageCode": "fr",
      "language": "French",
      "isGenerated": false,
      "isTranslatable": true
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `videoId` | string | The video ID |
| `transcripts` | array | List of available transcripts |
| `transcripts[].languageCode` | string | ISO language code |
| `transcripts[].language` | string | Full language name |
| `transcripts[].isGenerated` | boolean | Whether the transcript is auto-generated |
| `transcripts[].isTranslatable` | boolean | Whether the transcript can be translated to other languages |

**Example Usage:**

```javascript
const response = await fetch('http://localhost:5000/api/videos/transcript/available', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: 'aircAruvnKk'
  })
});

const data = await response.json();
console.log(`Available in ${data.transcripts.length} languages`);

// Filter for manual transcripts only
const manualTranscripts = data.transcripts.filter(t => !t.isGenerated);
```

---

### 3. Extract Video ID

Utility endpoint to extract a YouTube video ID from various URL formats.

**Endpoint:** `POST /api/videos/extract-id`

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (200 OK):**
```json
{
  "videoId": "dQw4w9WgXcQ",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Supported URL Formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`
- `https://www.youtube.com/v/VIDEO_ID`
- `VIDEO_ID` (11-character alphanumeric string)

**Example Usage:**

```javascript
const urls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ',
  'dQw4w9WgXcQ'
];

for (const url of urls) {
  const response = await fetch('http://localhost:5000/api/videos/extract-id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  const { videoId } = await response.json();
  console.log(`${url} → ${videoId}`);
}
```

---

## Error Handling

All endpoints return standardized error responses with appropriate HTTP status codes.

### Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE_CONSTANT",
  "details": "Additional technical details (optional)"
}
```

### HTTP Status Codes

| Status Code | Error Type | Description | Example |
|-------------|------------|-------------|---------|
| **400** | Bad Request | Invalid video ID format, missing parameters, or invalid URL | Missing `videoId` field |
| **404** | Not Found | Video unavailable, transcripts disabled, or no transcript in requested language | Transcripts disabled for video |
| **503** | Service Unavailable | YouTube API request failed (rate limiting, service issues) | YouTube is temporarily unavailable |
| **500** | Internal Server Error | Unexpected server errors | Database connection failure |

### Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `TRANSCRIPTS_DISABLED` | 404 | Transcripts are disabled for this video |
| `NO_TRANSCRIPT_FOUND` | 404 | No transcript found in the requested language(s) |
| `VIDEO_UNAVAILABLE` | 404 | Video doesn't exist or is private/restricted |
| `YOUTUBE_REQUEST_FAILED` | 503 | YouTube API request failed (rate limit or service issue) |

### Error Examples

**Missing Video ID (400):**
```json
{
  "error": "videoId is required"
}
```

**Invalid Video ID Format (400):**
```json
{
  "error": "Could not extract video ID from: invalid_url"
}
```

**Transcripts Disabled (404):**
```json
{
  "error": "Transcripts are disabled for this video",
  "code": "TRANSCRIPTS_DISABLED"
}
```

**No Transcript in Language (404):**
```json
{
  "error": "No transcript found: No transcript found in requested languages: ['fr', 'de']",
  "code": "NO_TRANSCRIPT_FOUND"
}
```

**Video Unavailable (404):**
```json
{
  "error": "Video is unavailable or does not exist",
  "code": "VIDEO_UNAVAILABLE"
}
```

**YouTube Service Error (503):**
```json
{
  "error": "YouTube request failed. Please try again later.",
  "code": "YOUTUBE_REQUEST_FAILED",
  "details": "HTTP 429: Too Many Requests"
}
```

---

## Language Support

### Language Preference Behavior

When `languageCodes` is provided, the API follows this priority:

1. **Manual transcripts** in the requested languages (in order)
2. **Auto-generated transcripts** in the requested languages (in order)
3. **Error** if no transcript found in any requested language

When `languageCodes` is omitted, the API returns the default transcript (usually English if available, or the first available transcript).

### Common Language Codes

| Code | Language |
|------|----------|
| `en` | English |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `zh` | Chinese |
| `ja` | Japanese |
| `ko` | Korean |
| `ar` | Arabic |
| `ru` | Russian |
| `pt` | Portuguese |

---

## Advanced Usage

### Fetching Full Transcript Text

```javascript
async function getFullTranscript(videoId) {
  const response = await fetch('http://localhost:5000/api/videos/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId })
  });

  const data = await response.json();

  // Combine all snippets into full text
  const fullText = data.snippets
    .map(snippet => snippet.text)
    .join(' ');

  return {
    text: fullText,
    duration: data.durationSeconds,
    language: data.language
  };
}
```

### Searching Within Transcript

```javascript
async function searchTranscript(videoId, searchTerm) {
  const response = await fetch('http://localhost:5000/api/videos/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId })
  });

  const data = await response.json();

  // Find all snippets containing the search term
  const matches = data.snippets.filter(snippet =>
    snippet.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return matches.map(snippet => ({
    text: snippet.text,
    timestamp: snippet.start,
    youtubeUrl: `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(snippet.start)}s`
  }));
}
```

### Multi-Language Fallback

```javascript
async function getTranscriptWithFallback(videoId, preferredLanguages) {
  try {
    const response = await fetch('http://localhost:5000/api/videos/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId,
        languageCodes: preferredLanguages
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`Failed to fetch preferred languages, trying default...`);

    // Fallback to default transcript
    const response = await fetch('http://localhost:5000/api/videos/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId })
    });

    return await response.json();
  }
}

// Usage
const transcript = await getTranscriptWithFallback('dQw4w9WgXcQ', ['es', 'fr', 'en']);
```

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│  video_routes.py│ (Flask Blueprint)
└────────┬────────┘
         │ Function Call
         ▼
┌─────────────────┐
│transcript_service│ (Business Logic)
└────────┬────────┘
         │ API Call
         ▼
┌─────────────────┐
│ youtube-transcript-api │
└─────────────────┘
```

### Service Layer Functions

Located in `server/services/transcript_service.py`:

- `extract_video_id(url_or_id)` - Parse YouTube URLs to extract video ID
- `fetch_transcript(video_id, language_codes)` - Fetch transcript with language preference
- `get_available_transcripts(video_id)` - List all available transcript languages
- `calculate_video_duration_from_transcript(snippets)` - Calculate video length from transcript
- `_format_transcript_response(...)` - Format raw transcript data into standardized response

### Dependencies

```
youtube-transcript-api>=1.2.3
```

**Why this library?**
- No YouTube API key required
- Supports multiple languages
- Handles both manual and auto-generated transcripts
- Actively maintained with regular updates

---

## Rate Limiting & Best Practices

### YouTube's Unofficial Limits

The `youtube-transcript-api` library uses YouTube's internal API, which doesn't have official rate limits, but best practices include:

- **Caching**: Store transcripts in your database to avoid re-fetching
- **Retry Logic**: Implement exponential backoff for failed requests
- **Error Handling**: Always handle `YouTubeRequestFailed` exceptions

### Recommended Caching Strategy

```python
# Pseudocode for future database caching
def get_transcript_with_cache(video_id, language_codes=None):
    # Check database cache first
    cached = db.query(Transcript).filter_by(video_id=video_id).first()

    if cached and not is_stale(cached.fetched_at):
        return cached.data

    # Fetch fresh transcript
    transcript = fetch_transcript(video_id, language_codes)

    # Store in database
    db.add(Transcript(
        video_id=video_id,
        data=transcript,
        fetched_at=datetime.utcnow()
    ))
    db.commit()

    return transcript
```

---

## Testing

### Running Tests

```bash
# Start the Flask server
cd server
python app.py

# In a separate terminal, run tests
cd server
python tests/test_transcript_api.py
```

### Test Coverage

The test suite includes 6 comprehensive test cases:

1. **Fetch with Video ID** - Basic functionality
2. **Fetch with URL** - URL parsing and extraction
3. **Language Preference** - Manual vs auto-generated transcripts
4. **List Available** - Metadata retrieval
5. **Extract Video ID** - Multiple URL format support
6. **Error Handling** - Invalid inputs and edge cases

### Expected Test Output

```
✅ Test 1: Fetch Transcript with Video ID - Success
✅ Test 2: Fetch Transcript with URL - Success
✅ Test 3: Fetch with Language Preference - Success
✅ Test 4: List Available Transcripts - Success
✅ Test 5: Extract Video ID - Success
✅ Test 6: Error Handling - Success
```