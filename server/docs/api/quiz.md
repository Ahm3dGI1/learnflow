# Quiz Generation API

Generate multiple choice quiz questions from video transcripts using LearnLM.

## Endpoint

```
POST /api/llm/quiz/generate
```

## Description

Analyzes video transcripts and generates multiple choice quiz questions that test understanding of key concepts. Questions include four options, one correct answer, and explanations.

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
        "text": "Welcome to this video about photosynthesis",
        "start": 0.0,
        "duration": 3.5
      },
      {
        "text": "Today we'll learn how plants make their own food",
        "start": 3.5,
        "duration": 3.2
      }
    ],
    "language": "English",
    "languageCode": "en"
  },
  "numQuestions": 5
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `videoId` | string | Yes | YouTube video ID |
| `transcript` | object | Yes | Transcript data object |
| `transcript.snippets` | array | Yes | Array of transcript snippets with text and timing |
| `transcript.language` | string | No | Full language name (e.g., "English") |
| `transcript.languageCode` | string | No | ISO language code (default: "en") |
| `numQuestions` | number | No | Number of questions to generate (default: 5, max: 20) |

## Response

### Success (200 OK)

```json
{
  "videoId": "dQw4w9WgXcQ",
  "language": "en",
  "cached": false,
  "questions": [
    {
      "id": 1,
      "question": "What is the primary function of chlorophyll in photosynthesis?",
      "options": [
        "To absorb light energy from the sun",
        "To store glucose for the plant",
        "To release oxygen into the air",
        "To transport water to the leaves"
      ],
      "correctAnswer": 0,
      "explanation": "Chlorophyll is the green pigment that captures light energy, which is the first step in photosynthesis."
    },
    {
      "id": 2,
      "question": "Where do the light-independent reactions occur?",
      "options": [
        "In the thylakoid membrane",
        "In the stroma of the chloroplast",
        "In the cell nucleus",
        "In the mitochondria"
      ],
      "correctAnswer": 1,
      "explanation": "The Calvin Cycle takes place in the stroma, the fluid-filled space in the chloroplast."
    }
  ],
  "totalQuestions": 2
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `videoId` | string | Video ID from request |
| `language` | string | Language code |
| `cached` | boolean | Whether result was served from cache |
| `questions` | array | Array of question objects |
| `questions[].id` | number | Question ID (1-indexed) |
| `questions[].question` | string | Question text |
| `questions[].options` | array | Four answer options |
| `questions[].correctAnswer` | number | Index of correct option (0-3) |
| `questions[].explanation` | string | Explanation of correct answer |
| `totalQuestions` | number | Total number of questions generated |

### Error Responses

**400 Bad Request**
```json
{
  "error": "videoId is required"
}
```

```json
{
  "error": "Number of questions must be between 1 and 20"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to generate quiz",
  "details": "Error description"
}
```

## Caching

Quiz results are cached for 1 hour based on:
- Video ID
- Language code
- Number of questions

Cache key format: `{videoId}:{languageCode}:{numQuestions}`

### Clear Cache

```
POST /api/llm/quiz/cache/clear
```

**Response**
```json
{
  "message": "Quiz cache cleared",
  "clearedItems": 5
}
```

## Example Usage

### Python

```python
import requests

url = "http://localhost:5000/api/llm/quiz/generate"

# Sample transcript data
transcript = {
    "snippets": [
        {"text": "Welcome to photosynthesis", "start": 0.0, "duration": 2.0},
        {"text": "Plants convert light to energy", "start": 2.0, "duration": 3.0},
        # ... more snippets
    ],
    "language": "English",
    "languageCode": "en"
}

payload = {
    "videoId": "abc123",
    "transcript": transcript,
    "numQuestions": 5
}

response = requests.post(url, json=payload, timeout=30)

if response.status_code == 200:
    data = response.json()
    
    print(f"Generated {data['totalQuestions']} questions")
    print(f"Cached: {data['cached']}")
    
    for q in data['questions']:
        print(f"\nQ{q['id']}: {q['question']}")
        for i, option in enumerate(q['options']):
            marker = "✓" if i == q['correctAnswer'] else " "
            print(f"  [{marker}] {option}")
        print(f"  Explanation: {q['explanation']}")
else:
    print(f"Error: {response.json()}")
```

### JavaScript (fetch)

```javascript
const url = 'http://localhost:5000/api/llm/quiz/generate';

const transcript = {
  snippets: [
    { text: "Welcome to photosynthesis", start: 0.0, duration: 2.0 },
    { text: "Plants convert light to energy", start: 2.0, duration: 3.0 },
    // ... more snippets
  ],
  language: "English",
  languageCode: "en"
};

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    videoId: "abc123",
    transcript: transcript,
    numQuestions: 5
  })
});

const data = await response.json();

console.log(`Generated ${data.totalQuestions} questions`);
console.log(`Cached: ${data.cached}`);

data.questions.forEach(q => {
  console.log(`\nQ${q.id}: ${q.question}`);
  q.options.forEach((option, i) => {
    const marker = i === q.correctAnswer ? '✓' : ' ';
    console.log(`  [${marker}] ${option}`);
  });
  console.log(`  Explanation: ${q.explanation}`);
});
```

### cURL

```bash
curl -X POST http://localhost:5000/api/llm/quiz/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "abc123",
    "transcript": {
      "snippets": [
        {"text": "Photosynthesis intro", "start": 0.0, "duration": 2.0}
      ],
      "languageCode": "en"
    },
    "numQuestions": 3
  }'
```

## Question Quality

The AI generates questions that:

1. **Test Understanding**: Focus on concepts, not trivial facts
2. **Are Clear**: Unambiguous and well-worded
3. **Have Plausible Distractors**: Wrong answers that seem reasonable
4. **Cover Different Topics**: Distributed across the video content
5. **Match Difficulty**: Appropriate for the educational level

### Question Types

- **Conceptual**: "What is X?" or "Define Y"
- **Application**: "How would you use X?"
- **Analysis**: "Why does X happen?"
- **Comparison**: "What's the difference between X and Y?"

## Best Practices

### Transcript Length

For optimal results:
- Minimum: 500 words (2-3 minutes of video)
- Maximum: 8000 characters (automatically truncated)
- Ideal: Full transcript of 5-20 minute educational video

### Number of Questions

- Short videos (< 5 min): 3-5 questions
- Medium videos (5-15 min): 5-8 questions
- Long videos (> 15 min): 8-12 questions

### Caching Strategy

```python
# Check if quiz exists in cache first
cache_check_payload = {
    "videoId": video_id,
    "transcript": transcript,
    "numQuestions": 5
}

response = requests.post(url, json=cache_check_payload)
data = response.json()

if data['cached']:
    print("Using cached quiz (instant)")
else:
    print("Generated new quiz (10-15 seconds)")
```

### Error Handling

```python
try:
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    
    # Validate response structure
    if 'questions' not in data:
        raise ValueError("Invalid response format")
    
    return data
    
except requests.exceptions.Timeout:
    print("Quiz generation timed out (LLM may be overloaded)")
    return None
    
except requests.exceptions.HTTPError as e:
    print(f"HTTP Error: {e.response.status_code}")
    print(f"Details: {e.response.json()}")
    return None
    
except Exception as e:
    print(f"Unexpected error: {str(e)}")
    return None
```

## Performance Notes

### Response Times

- **First Request**: 10-20 seconds (LLM generation)
- **Cached Request**: < 100ms (instant)
- **Factors**: Video length, number of questions, API load

### Optimization Tips

1. **Cache Results**: Use the same `numQuestions` for repeated requests
2. **Limit Transcript**: Truncate very long transcripts
3. **Batch Requests**: Generate quizzes during video processing, not on-demand
4. **Error Recovery**: Implement retry logic with exponential backoff

## Integration Example

### Complete Workflow

```python
def create_quiz_for_video(video_id, transcript_data):
    """Generate and cache quiz for a video."""
    
    url = "http://localhost:5000/api/llm/quiz/generate"
    
    # Generate quiz
    payload = {
        "videoId": video_id,
        "transcript": transcript_data,
        "numQuestions": 5
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        response.raise_for_status()
        
        quiz_data = response.json()
        
        # Save to database for frontend
        save_quiz_to_db(video_id, quiz_data)
        
        return quiz_data
        
    except Exception as e:
        print(f"Failed to generate quiz: {e}")
        return None


def display_quiz(quiz_data):
    """Display quiz to student."""
    
    print(f"\n=== Quiz: {len(quiz_data['questions'])} Questions ===\n")
    
    for q in quiz_data['questions']:
        print(f"Question {q['id']}: {q['question']}\n")
        
        for i, option in enumerate(q['options']):
            print(f"  {chr(65+i)}. {option}")
        
        print()  # Blank line between questions
```

## Common Issues

### Issue: Quiz questions are too easy/hard

**Solution**: This depends on the video content. The LLM generates questions based on the complexity of the material in the transcript.

### Issue: Questions repeat concepts

**Solution**: Ensure transcript is comprehensive and covers multiple topics. For very short videos, reduce `numQuestions`.

### Issue: Slow generation time

**Solution**: 
- Check API rate limits
- Ensure transcript isn't too long (> 8000 chars)
- Use caching for repeated requests
- Consider pre-generating quizzes during video upload

### Issue: JSON parsing errors

**Solution**: The service handles markdown code blocks automatically. If you still see errors, check the LLM response in server logs.
