# LearnFlow API Tests

Manual test scripts for LearnFlow API endpoints.

## Test Files

### `test_checkpoint_api.py`

Comprehensive test suite for the checkpoint generation API.

**Tests included:**
- ✅ Checkpoint generation with sample transcript
- ✅ Caching validation (second request should be instant)
- ✅ Health check endpoint
- ✅ Error handling (missing fields, invalid data)

## Running Tests

### Prerequisites

1. **Install dependencies:**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

2. **Set up environment:**
   ```bash
   # Copy and fill in .env file
   cp ../.env_template ../.env
   # Add your GEMINI_API_KEY
   ```

3. **Start the server:**
   ```bash
   python app.py
   ```
   Server should be running on `http://localhost:5000`

### Run Checkpoint API Tests

In a **new terminal** (keep server running):

```bash
cd server
python tests/test_checkpoint_api.py
```

### Expected Output

```
🚀 LearnFlow Checkpoint API Test Suite
Make sure the server is running: python app.py

Press Enter to start tests...

============================================================
Testing Checkpoint Generation API
============================================================

📤 Sending request to: http://localhost:5000/api/llm/checkpoints/generate
Video ID: test-video-123
Transcript snippets: 18
Language: English

⏳ Generating checkpoints (this may take 5-15 seconds)...

✅ Success! Checkpoints generated.

------------------------------------------------------------
Video ID: test-video-123
Language: en
Cached: False
Total Checkpoints: 3
------------------------------------------------------------

📍 Generated Checkpoints:

  1. [02:15] Photosynthesis Overview
     └─ Understanding the basic process of photosynthesis
     └─ Seconds: 135

  2. [05:40] Light-Dependent Reactions
     └─ How light energy is captured and converted
     └─ Seconds: 340

  3. [08:20] Calvin Cycle
     └─ Converting carbon dioxide into glucose
     └─ Seconds: 500

============================================================
Testing Cache (Second Request)
============================================================

📤 Sending same request again...
⏳ This should be instant (cached)...

✅ Response served from cache! (< 100ms)

Cached: True
Total Checkpoints: 3

============================================================
Testing Health Check
============================================================

✅ Service Status: ok
Cache Size: 1 items

============================================================
Testing Error Handling
============================================================

1. Testing missing videoId...
   Status: 400
   Error: videoId is required

2. Testing missing transcript...
   Status: 400
   Error: transcript is required

3. Testing empty snippets...
   Status: 400
   Error: transcript.snippets is required

✅ All error cases handled correctly

============================================================
✅ All tests completed!
============================================================
```

## What Each Test Does

### 1. Checkpoint Generation Test
- Sends a sample transcript (photosynthesis video)
- Waits for LLM to generate checkpoints (5-15 seconds)
- Validates response structure
- Displays generated checkpoints with timestamps

### 2. Cache Test
- Sends the same request again
- Should return instantly from cache
- Validates `cached: true` flag in response

### 3. Health Check Test
- Calls `GET /api/llm/health`
- Checks service status
- Shows current cache size

### 4. Error Handling Test
- Tests missing `videoId` → 400 error
- Tests missing `transcript` → 400 error  
- Tests empty `snippets` → 400 error
- Validates proper error messages

## Troubleshooting

### Server Not Running
```
❌ Connection error. Is the server running?
Start the server with: python app.py
```
**Solution:** Start the server in another terminal first

### Request Timeout
```
❌ Request timed out. The server might be overloaded.
Try again in a few seconds.
```
**Solution:** 
- Wait a few seconds and try again
- LLM service might be overloaded
- Check your `GEMINI_API_KEY` is valid

### Missing API Key
```
ValueError: GEMINI_API_KEY not found in environment variables.
```
**Solution:** 
- Add `GEMINI_API_KEY` to your `.env` file
- Get key from: https://aistudio.google.com/apikey

### Import Errors
```
ModuleNotFoundError: No module named 'requests'
```
**Solution:**
```bash
pip install requests
```

## Manual Testing with cURL

Instead of using the test script, you can test manually:

### Generate Checkpoints
```bash
curl -X POST http://localhost:5000/api/llm/checkpoints/generate \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "test-123",
    "transcript": {
      "snippets": [
        {"text": "Hello world", "start": 0.0, "duration": 1.5}
      ],
      "languageCode": "en"
    }
  }'
```

### Health Check
```bash
curl http://localhost:5000/api/llm/health
```

### Clear Cache
```bash
curl -X POST http://localhost:5000/api/llm/checkpoints/cache/clear
```

## Next Steps

After running tests:
1. ✅ Verify all tests pass
2. ✅ Check checkpoint quality and relevance
3. ✅ Test with real YouTube transcripts
4. ✅ Try different video lengths
5. ✅ Monitor LLM response times

## Writing New Tests

To add more test cases:

1. Create a new function in `test_checkpoint_api.py`:
   ```python
   def test_new_feature():
       """Test description."""
       # Your test code
       pass
   ```

2. Call it in `__main__`:
   ```python
   if __name__ == "__main__":
       test_checkpoint_generation()
       test_new_feature()  # Add here
   ```

3. Run the tests again

## CI/CD Integration (Future)

These tests will be integrated into automated testing pipeline:
- Run on every PR
- Automated regression testing
- Performance benchmarking
- Coverage reporting
