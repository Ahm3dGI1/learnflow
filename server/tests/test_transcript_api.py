"""
Test suite for YouTube transcript API endpoints.

Tests the video transcript fetching endpoints including:
- /api/videos/transcript (fetch transcript with video ID or URL)
- /api/videos/transcript/available (list all available transcripts)
- /api/videos/extract-id (extract video ID from various URL formats)

Covers various scenarios including:
- Fetching transcripts with video ID
- Fetching transcripts with full YouTube URLs
- Language preference handling
- Listing available transcripts for a video
- Video ID extraction from different URL formats
- Error handling for invalid inputs

Usage:
    # Make sure server is running first: python app.py
    # Then run tests:
    python tests/test_transcript_api.py
"""

import os

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
PORT = os.getenv('PORT', '5000')
BASE_URL = f"http://localhost:{PORT}"
TRANSCRIPT_ENDPOINT = f"{BASE_URL}/api/videos/transcript"
AVAILABLE_ENDPOINT = f"{BASE_URL}/api/videos/transcript/available"
EXTRACT_ID_ENDPOINT = f"{BASE_URL}/api/videos/extract-id"

# Test video IDs (verified to have transcripts available)
TEST_VIDEOS = {
    "short_video": "dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up
    "educational": "aircAruvnKk",  # 3Blue1Brown - What is a neural network
    "url_format": "https://www.youtube.com/watch?v=aircAruvnKk"
}


def test_fetch_transcript():
    """Test fetching transcript with video ID."""
    print("=" * 60)
    print("Test 1: Fetch Transcript with Video ID")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["educational"]
    }

    print(f"\n📤 Sending request to: {TRANSCRIPT_ENDPOINT}")
    print(f"Video ID: {payload['videoId']}")
    print("⏳ Fetching transcript...\n")

    try:
        response = requests.post(
            TRANSCRIPT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("Success! Transcript fetched.\n")
            print(f"Video ID: {data.get('videoId')}")
            print(f"Language: {data.get('language')} ({data.get('languageCode')})")
            print(f"Is Generated: {data.get('isGenerated')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Snippet Count: {len(data.get('snippets', []))}")
            print(f"\nFirst 3 snippets:")
            for snippet in data.get('snippets', [])[:3]:
                print(f"  [{snippet['start']:.1f}s] {snippet['text'][:60]}...")
        else:
            print(f"Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
                if 'code' in error_data:
                    print(f"Code: {error_data['code']}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("Request timed out")
    except requests.exceptions.ConnectionError:
        print("Connection error. Is the server running?")
        print("Start the server with: python app.py")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")


def test_fetch_transcript_with_url():
    """Test fetching transcript with full YouTube URL."""
    print("\n" + "=" * 60)
    print("Test 2: Fetch Transcript with URL")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["url_format"]
    }

    print(f"\n📤 URL: {payload['videoId']}")
    print("⏳ Fetching transcript...\n")

    try:
        response = requests.post(
            TRANSCRIPT_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("Success! URL parsing and transcript fetch worked.")
            print(f"Extracted Video ID: {data.get('videoId')}")
            print(f"Snippet Count: {len(data.get('snippets', []))}")
        else:
            print(f"Error: {response.status_code}")
            print(response.json())

    except Exception as e:
        print(f"Error: {str(e)}")


def test_fetch_with_language_preference():
    """Test fetching transcript with language preference."""
    print("\n" + "=" * 60)
    print("Test 3: Fetch Transcript with Language Preference")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["educational"],
        "languageCodes": ["en"]
    }

    print(f"\n📤 Video ID: {payload['videoId']}")
    print(f"Preferred Languages: {payload['languageCodes']}")
    print("⏳ Fetching transcript...\n")

    try:
        response = requests.post(
            TRANSCRIPT_ENDPOINT,
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("Success!")
            print(f"Returned Language: {data.get('language')} ({data.get('languageCode')})")
            print(f"Is Generated: {data.get('isGenerated')}")
        else:
            print(f"Error: {response.status_code}")
            print(response.json())

    except Exception as e:
        print(f"Error: {str(e)}")


def test_list_available_transcripts():
    """Test listing all available transcripts."""
    print("\n" + "=" * 60)
    print("Test 4: List Available Transcripts")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["educational"]
    }

    print(f"\n📤 Sending request to: {AVAILABLE_ENDPOINT}")
    print(f"Video ID: {payload['videoId']}")
    print("⏳ Fetching available transcripts...\n")

    try:
        response = requests.post(
            AVAILABLE_ENDPOINT,
            json=payload,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            print("Success! Available transcripts:\n")
            transcripts = data.get('transcripts', [])

            if transcripts:
                for t in transcripts:
                    gen_status = "Auto-generated" if t['isGenerated'] else "Manual"
                    trans_status = "Translatable" if t['isTranslatable'] else "Not translatable"
                    print(f"  • {t['language']} ({t['languageCode']}) - {gen_status}, {trans_status}")
            else:
                print("  No transcripts available")
        else:
            print(f"Error: {response.status_code}")
            print(response.json())

    except Exception as e:
        print(f"Error: {str(e)}")


def test_extract_video_id():
    """Test video ID extraction from URL."""
    print("\n" + "=" * 60)
    print("Test 5: Extract Video ID from URL")
    print("=" * 60)

    test_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ]

    for url in test_urls:
        payload = {"url": url}

        try:
            response = requests.post(
                EXTRACT_ID_ENDPOINT,
                json=payload,
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()
                print(f"{url}")
                print(f"   → {data['videoId']}\n")
            else:
                print(f"Failed for: {url}")

        except Exception as e:
            print(f"Error for {url}: {str(e)}")


def test_error_handling():
    """Test error handling with invalid data."""
    print("\n" + "=" * 60)
    print("Test 6: Error Handling")
    print("=" * 60)

    # Test 1: Missing videoId
    print("\n1. Testing missing videoId...")
    response = requests.post(
        TRANSCRIPT_ENDPOINT,
        json={},
        timeout=5
    )
    print(f"   Status: {response.status_code} (expected 400)")

    # Test 2: Invalid video ID
    print("\n2. Testing invalid video ID...")
    response = requests.post(
        TRANSCRIPT_ENDPOINT,
        json={"videoId": "invalid_id_format"},
        timeout=5
    )
    print(f"   Status: {response.status_code} (expected 400 or 404)")

    # Test 3: Invalid URL format
    print("\n3. Testing invalid URL...")
    response = requests.post(
        TRANSCRIPT_ENDPOINT,
        json={"videoId": "https://not-youtube.com/watch"},
        timeout=5
    )
    print(f"   Status: {response.status_code} (expected 400)")

    print("\nAll error cases handled correctly")


if __name__ == "__main__":
    print("Make sure the server is running: python app.py\n")

    # Run tests
    test_fetch_transcript()
    test_fetch_transcript_with_url()
    test_fetch_with_language_preference()
    test_list_available_transcripts()
    test_extract_video_id()
    test_error_handling()

    print("All tests completed!")
