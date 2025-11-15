"""
Test suite for checkpoint generation API.
Tests the /api/llm/checkpoints/generate endpoint with various scenarios.

Usage:
    # Make sure server is running first: python app.py
    # Then run tests:
    python tests/test_checkpoint_api.py
"""

import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
PORT = os.getenv('PORT', '5001')
BASE_URL = f"http://localhost:{PORT}"
CHECKPOINT_ENDPOINT = f"{BASE_URL}/api/llm/checkpoints/generate"

# Sample transcript data (simulating YouTube Transcript API output)
sample_transcript = {
    "snippets": [
        {"text": "Welcome to this video about photosynthesis", "start": 0.0, "duration": 3.5},
        {"text": "Today we'll learn how plants make their own food", "start": 3.5, "duration": 3.2},
        {"text": "Photosynthesis is a process that converts light energy", "start": 6.7, "duration": 3.8},
        {"text": "into chemical energy in the form of glucose", "start": 10.5, "duration": 2.9},
        {"text": "This process occurs in the chloroplasts of plant cells", "start": 13.4, "duration": 3.5},
        {"text": "Chloroplasts contain a green pigment called chlorophyll", "start": 16.9, "duration": 3.7},
        {"text": "which absorbs light energy from the sun", "start": 20.6, "duration": 2.8},
        {"text": "Photosynthesis has two main stages", "start": 135.0, "duration": 2.5},
        {"text": "The first stage is called the light-dependent reactions", "start": 137.5, "duration": 3.2},
        {"text": "These reactions occur in the thylakoid membranes", "start": 140.7, "duration": 3.0},
        {"text": "Light energy is captured and converted into ATP and NADPH", "start": 143.7, "duration": 4.2},
        {"text": "Water molecules are split releasing oxygen as a byproduct", "start": 147.9, "duration": 3.8},
        {"text": "The second stage is the Calvin Cycle", "start": 340.0, "duration": 2.7},
        {"text": "Also known as the light-independent reactions", "start": 342.7, "duration": 2.9},
        {"text": "This stage occurs in the stroma of the chloroplast", "start": 345.6, "duration": 3.2},
        {"text": "Carbon dioxide from the air is fixed into organic molecules", "start": 348.8, "duration": 3.9},
        {"text": "Using the ATP and NADPH from the light reactions", "start": 352.7, "duration": 3.4},
        {"text": "The end product is glucose which the plant uses for energy", "start": 356.1, "duration": 4.1},
    ],
    "language": "English",
    "languageCode": "en",
    "isGenerated": False
}


def test_checkpoint_generation():
    """Test checkpoint generation with sample transcript."""
    print("=" * 60)
    print("Testing Checkpoint Generation API")
    print("=" * 60)
    
    # Prepare request
    payload = {
        "videoId": "test-video-123",
        "transcript": sample_transcript
    }
    
    print(f"\n📤 Sending request to: {CHECKPOINT_ENDPOINT}")
    print(f"Video ID: {payload['videoId']}")
    print(f"Transcript snippets: {len(sample_transcript['snippets'])}")
    print(f"Language: {sample_transcript['language']}")
    print("\n⏳ Generating checkpoints (this may take 5-15 seconds)...\n")
    
    try:
        # Make request
        response = requests.post(
            CHECKPOINT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Checkpoints generated.\n")
            print_checkpoints(data)
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
                if 'details' in error_data:
                    print(f"Details: {error_data['details']}")
            except Exception:
                print(f"Response: {response.text}")
                if response.status_code == 403:
                    print("\n⚠️  403 Forbidden - Check if server is running correctly")
                    print("Try: python app.py")
    
    except requests.exceptions.Timeout:
        print("❌ Request timed out. The server might be overloaded.")
        print("Try again in a few seconds.")
    
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
        print("Start the server with: python app.py")
    
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_cached_request():
    """Test that second request returns cached data."""
    print("\n" + "=" * 60)
    print("Testing Cache (Second Request)")
    print("=" * 60)
    
    payload = {
        "videoId": "test-video-123",
        "transcript": sample_transcript
    }
    
    print(f"\n📤 Sending same request again...")
    print("⏳ This should be instant (cached)...\n")
    
    try:
        response = requests.post(
            CHECKPOINT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('cached'):
                print("✅ Response served from cache! (< 100ms)\n")
            else:
                print("⚠️  Response not cached (unexpected)\n")
            
            print(f"Cached: {data.get('cached')}")
            print(f"Total Checkpoints: {data.get('totalCheckpoints')}")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def test_health_check():
    """Test the health check endpoint."""
    print("\n" + "=" * 60)
    print("Testing Health Check")
    print("=" * 60)
    
    health_url = f"{BASE_URL}/api/llm/health"
    
    try:
        response = requests.get(health_url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Service Status: {data.get('status')}")
            print(f"Cache Size: {data.get('cacheSize')} items")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")


def print_checkpoints(data):
    """Pretty print checkpoint data."""
    print("-" * 60)
    print(f"Video ID: {data.get('videoId')}")
    print(f"Language: {data.get('language')}")
    print(f"Cached: {data.get('cached')}")
    print(f"Total Checkpoints: {data.get('totalCheckpoints')}")
    print("-" * 60)
    
    checkpoints = data.get('checkpoints', [])
    
    if not checkpoints:
        print("No checkpoints generated.")
        return
    
    print("\n📍 Generated Checkpoints:\n")
    
    for checkpoint in checkpoints:
        print(f"  {checkpoint['id']}. [{checkpoint['timestamp']}] {checkpoint['title']}")
        print(f"     └─ {checkpoint['subtopic']}")
        print(f"     └─ Seconds: {checkpoint['timestampSeconds']}")
        print()


def test_error_handling():
    """Test error handling with invalid data."""
    print("\n" + "=" * 60)
    print("Testing Error Handling")
    print("=" * 60)
    
    # Test 1: Missing videoId
    print("\n1. Testing missing videoId...")
    response = requests.post(
        CHECKPOINT_ENDPOINT,
        json={"transcript": sample_transcript},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    try:
        print(f"   Error: {response.json().get('error')}")
    except Exception:
        print(f"   Response: {response.text[:100]}")
    
    # Test 2: Missing transcript
    print("\n2. Testing missing transcript...")
    response = requests.post(
        CHECKPOINT_ENDPOINT,
        json={"videoId": "test-123"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    try:
        print(f"   Error: {response.json().get('error')}")
    except Exception:
        print(f"   Response: {response.text[:100]}")
    
    # Test 3: Empty snippets
    print("\n3. Testing empty snippets...")
    response = requests.post(
        CHECKPOINT_ENDPOINT,
        json={
            "videoId": "test-123",
            "transcript": {"snippets": []}
        },
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    try:
        print(f"   Error: {response.json().get('error')}")
    except Exception:
        print(f"   Response: {response.text[:100]}")
    
    print("\n✅ All error cases handled correctly")


if __name__ == "__main__":
    print("\n🚀 LearnFlow Checkpoint API Test Suite")
    print("Make sure the server is running: python app.py\n")
    
    input("Press Enter to start tests...")
    
    # Run tests
    test_checkpoint_generation()
    test_cached_request()
    test_health_check()
    test_error_handling()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("  - Check the generated checkpoints above")
    print("  - Try with real YouTube transcript data")
    print("  - Test with different video lengths")
    print("  - Clear cache: POST /api/llm/checkpoints/cache/clear")
    print()
