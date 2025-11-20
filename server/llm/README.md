# LearnLM Client Documentation

Centralized client for interacting with Google's LearnLM model in LearnFlow.

## Overview

The `LearnLMClient` provides a clean interface to Google's LearnLM, a specialized model designed for educational applications. It handles initialization, configuration, and content generation with built-in LearnFlow system instructions.

## Setup

### 1. Environment Configuration

Add to your `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL_NAME=learnlm-2.0-flash-experimental  # Optional, this is the default
```

Get your API key: [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Installation

The required package is already in `requirements.txt`:

```bash
pip install google-genai
```

## Usage

### Basic Import

```python
from llm import get_client

# Get singleton client instance
client = get_client()
```

### Non-Streaming Generation

Best for: Short responses, JSON outputs, when you need the complete result

```python
client = get_client()

response = client.generate_content(
    prompt="Explain photosynthesis in simple terms"
)

print(response)
```

### Streaming Generation

Best for: Long responses, chat interfaces, real-time user feedback

```python
client = get_client()

for chunk in client.generate_content_stream(
    prompt="Explain cellular respiration"
):
    print(chunk, end="", flush=True)
```

**Important:** Use `flush=True` to see streaming output in real-time!

### Custom System Instructions

The client uses LearnFlow's default system instructions from `prompts/system.py`. You can override them:

```python
client = get_client()

custom_instruction = "You are a math tutor. Be concise and use examples."

response = client.generate_content(
    prompt="What is the Pythagorean theorem?",
    system_instruction=custom_instruction
)
```

### Adjusting Temperature

Control creativity/randomness (0.0 = deterministic, 1.0 = creative):

```python
client = get_client()

# More creative/varied responses
response = client.generate_content(
    prompt="Create an analogy for mitochondria",
    temperature=1.0
)

# More focused/consistent responses
response = client.generate_content(
    prompt="Define photosynthesis",
    temperature=0.3
)
```

### Additional Parameters

Pass any additional configuration via `**kwargs`:

```python
response = client.generate_content(
    prompt="Your question here",
    temperature=0.7,
    max_output_tokens=1024,
    top_p=0.95
)
```

## Client Methods

### `generate_content(prompt, system_instruction=None, temperature=0.7, **kwargs)`

Generate complete response (non-streaming).

**Parameters:**
- `prompt` (str): User prompt/question
- `system_instruction` (str, optional): Custom system instruction. If None, uses LearnFlow defaults
- `temperature` (float): Randomness (0.0-1.0), default 0.7
- `**kwargs`: Additional config parameters

**Returns:** `str` - Complete response text

### `generate_content_stream(prompt, system_instruction=None, temperature=0.7, **kwargs)`

Generate streaming response.

**Parameters:** Same as `generate_content()`

**Yields:** `str` - Text chunks as they're generated

## Complete Example

```python
from llm import get_client

def main():
    # Initialize client
    client = get_client()
    print(f"Using model: {client.model_name}\n")
    
    # Example 1: Basic question
    print("=== Basic Question ===")
    response = client.generate_content(
        prompt="What are the three states of matter?"
    )
    print(response)
    
    # Example 2: Streaming response
    print("\n=== Streaming Response ===")
    for chunk in client.generate_content_stream(
        prompt="Explain the water cycle"
    ):
        print(chunk, end="", flush=True)
    print("\n")
    
    # Example 3: Custom system instruction
    print("\n=== Custom System Instruction ===")
    response = client.generate_content(
        prompt="Teach me about variables in Python",
        system_instruction="You are a coding instructor. Use simple examples.",
        temperature=0.5
    )
    print(response)

if __name__ == "__main__":
    main()
```

## Default System Instructions

The client automatically uses LearnFlow's educational system instructions which include:
- Socratic questioning methodology
- Checkpoint generation guidelines
- Conversational tutoring approach
- Student-centered learning strategies

See `server/prompts/system.py` for the complete instructions.

## Performance Notes

**Expected Response Times:**
- Simple queries: 2-5 seconds
- Complex educational responses: 5-15 seconds
- With system instructions: 10-20 seconds

**Why LearnLM is slower:**
- Specialized for educational reasoning
- Generates thoughtful, pedagogically sound responses
- More processing than standard chat models

**Tips:**
- Use streaming for better perceived performance
- Cache responses when possible
- Consider rate limiting for production use

## Error Handling

```python
from llm import get_client

try:
    client = get_client()
    response = client.generate_content("Your prompt")
except ValueError as e:
    # Missing API key or configuration
    print(f"Configuration error: {e}")
except Exception as e:
    # API errors (overload, network, etc.)
    print(f"API error: {e}")
    # Consider retry logic with exponential backoff
```

## Architecture

The client uses a **singleton pattern** - one instance is created and reused throughout the application lifetime for efficiency.

```python
# Both calls return the same instance
client1 = get_client()
client2 = get_client()
assert client1 is client2  # True
```

## Integration Examples

### For Checkpoint Generation

```python
client = get_client()

checkpoint_prompt = f"""
Generate learning checkpoints from this transcript:
{video_transcript}
"""

response = client.generate_content(
    prompt=checkpoint_prompt,
    temperature=0.7
)

# Parse JSON response
import json
checkpoints = json.loads(response)
```

### For Chat Sessions

```python
client = get_client()

# Streaming for real-time chat experience
for chunk in client.generate_content_stream(
    prompt=user_message,
    temperature=0.8
):
    yield chunk  # Send to frontend via WebSocket/SSE
```

### For Quiz Generation

```python
client = get_client()

quiz_prompt = f"""
Generate 5 multiple choice questions about: {topic}
Use this transcript: {transcript}
"""

response = client.generate_content(
    prompt=quiz_prompt,
    temperature=0.5  # Lower temp for consistent quiz format
)
```

## Future Enhancements

Planned features:
- Multi-turn conversation support with history
- Retry logic with exponential backoff
- Response caching
- Token usage tracking
- Custom model selection per request
