# LearnFlow API Routes

This directory contains Flask blueprints for all API endpoints.

## Structure

```
routes/
├── __init__.py          # Route exports
└── llm_routes.py        # LLM-related endpoints (/api/llm/*)
```

## Available Routes

### LLM Routes (`/api/llm/*`)

AI-powered features using LearnLM model.

**Endpoints:**
- `POST /api/llm/checkpoints/generate` - Generate learning checkpoints from video transcript
- `POST /api/llm/checkpoints/cache/clear` - Clear checkpoint cache (admin/testing)
- `GET /api/llm/health` - Health check for LLM services

**Documentation:** [docs/api/checkpoints.md](../docs/api/checkpoints.md)

### Quiz Routes (`/api/quiz/*`)

Quiz generation and management (legacy endpoints in `app.py`).

**Endpoints:**
- `GET /api/quiz/<quiz_id>` - Get quiz by ID
- `POST /api/quiz/generate` - Generate quiz (mock data)
- `POST /api/quiz/submit` - Submit quiz answers

**Status:** Will be refactored to use LLM in future PR

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

## Future Routes

Planned endpoints for upcoming features:

- **Chat Routes** (`/api/llm/chat/*`) - Conversational tutoring
- **Quiz Routes (v2)** (`/api/llm/quiz/*`) - LLM-powered quiz generation
- **User Routes** (`/api/user/*`) - User profiles and progress tracking
- **Video Routes** (`/api/video/*`) - Video metadata and transcript management

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

- [Checkpoint API](../docs/api/checkpoints.md) - Detailed checkpoint endpoint documentation
- [LLM Client](../llm/README.md) - LearnLM client usage
- [Services](../services/) - Business logic implementation
