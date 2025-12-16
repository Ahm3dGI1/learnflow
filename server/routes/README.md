# LearnFlow API Routes

This directory contains Flask blueprints for all API endpoints.

## Structure

```
routes/
├── __init__.py          # Route exports
├── llm_routes.py        # LLM-related endpoints (/api/llm/*)
├── video_routes.py      # Video and transcript endpoints (/api/videos/*)
├── user_routes.py       # User management endpoints (/api/users/*)
└── progress_routes.py   # Progress tracking endpoints (/api/progress/*)
```

## Available Routes

### LLM Routes (`/api/llm/*`)

AI-powered features using LearnLM model. All endpoints require Firebase authentication.

**Endpoints:**
- `POST /api/llm/checkpoints/generate` - Generate learning checkpoints
- `POST /api/llm/quiz/generate` - Generate quiz questions
- `POST /api/llm/quiz/submit` - Submit quiz answers and get results
- `POST /api/llm/chat/stream` - AI tutoring chat (streaming)
- `POST /api/llm/summary/generate` - Generate video summary
- `GET /api/llm/health` - Health check for LLM services
- Cache clear endpoints for testing

**Documentation:** [docs/api/](../docs/api/)

### Video Routes (`/api/videos/*`)

Video metadata, transcripts, and watch history.

**Endpoints:**
- `POST /api/videos/transcript` - Fetch video transcript
- `POST /api/videos/transcript/available` - List available transcript languages
- `GET /api/videos/history/{uid}` - Get user's video watch history
- `POST /api/videos/history/{uid}` - Add/update video in history
- `DELETE /api/videos/history/{uid}/{videoId}` - Remove video from history
- `DELETE /api/videos/history/{uid}` - Clear all history

**Documentation:** [docs/TRANSCRIPT_API.md](../docs/TRANSCRIPT_API.md)

### User Routes (`/api/users/*`)

User management with Firebase authentication.

**Endpoints:**
- `GET /api/users/me` - Get current authenticated user
- `POST /api/users` - Create or update user from Firebase claims

### Progress Routes (`/api/progress/*`)

Track user learning progress across videos.

**Endpoints:**
- `GET /api/progress/users/<firebase_uid>/videos/<video_id>` - Get progress for specific video
- `POST /api/progress/users/<firebase_uid>/videos/<video_id>` - Update progress for a specific video
- `PUT /api/progress/users/<firebase_uid>/videos/<video_id>/complete` - Mark video as complete
- `GET /api/progress/users/<firebase_uid>` - Get all progress for user

## Adding New Routes

### 1. Create a new blueprint file

```python
# routes/new_feature_routes.py
from flask import Blueprint, request, jsonify

feature_bp = Blueprint('feature', __name__, url_prefix='/api/feature')

@feature_bp.route('/endpoint', methods=['POST'])
def endpoint():
    # Implementation
    pass
```

### 2. Export in `__init__.py`

```python
# routes/__init__.py
from .llm_routes import llm_bp
from .new_feature_routes import feature_bp

__all__ = ['llm_bp', 'feature_bp']
```

### 3. Register in `app.py`

```python
# app.py
from routes import llm_bp, feature_bp

app.register_blueprint(llm_bp)
app.register_blueprint(feature_bp)
```

### 4. Add documentation

Create `docs/api/feature-name.md` with detailed endpoint documentation.

## Best Practices

1. **Use Blueprints** - Group related endpoints
2. **URL Prefix** - Use consistent prefixes (`/api/resource/*`)
3. **HTTP Methods** - Follow REST conventions (GET, POST, PUT, DELETE)
4. **Error Handling** - Return consistent error responses with status codes
5. **Documentation** - Document all endpoints in `docs/api/`
6. **Validation** - Validate request data before processing
7. **Separation of Concerns** - Keep routes thin, business logic in `services/`

## Example Route Structure

```python
@bp.route('/resource', methods=['POST'])
def create_resource():
    """
    Create a new resource.
    
    Request: {...}
    Response: {...}
    Status Codes: 200, 400, 500
    """
    try:
        # 1. Parse and validate request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # 2. Call service layer
        result = service_function(data)
        
        # 3. Return response
        return jsonify(result), 200
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Internal error', 'details': str(e)}), 500
```

## Middleware

All authenticated routes use the following middleware:

- **`@auth_required`** - Validates Firebase JWT tokens
- **`@rate_limit`** - Applies rate limiting (user or video scoped)

## Development

### Testing Routes

```bash
# Start server
python app.py

# Test endpoint
curl -X POST http://localhost:5000/api/llm/health
```

### Debugging

Enable debug mode in `app.py`:
```python
app.run(debug=True, port=PORT)
```

## Related Documentation

- [API Documentation](../docs/api/) - Full API endpoint documentation
- [Transcript API](../docs/TRANSCRIPT_API.md) - YouTube transcript fetching
- [LLM Client](../llm/README.md) - LearnLM client usage
- [Services](../services/) - Business logic implementation
