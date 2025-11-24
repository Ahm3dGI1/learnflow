import os

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
PORT = os.getenv('PORT', '5000')
BASE_URL = f"http://localhost:{PORT}"
VIDEO_ENDPOINT = f"{BASE_URL}/api/videos"

# Test video IDs (verified to have transcripts available)
TEST_VIDEOS = {
    "educational": "aircAruvnKk",  # 3Blue1Brown - What is a neural network
    "short_video": "dQw4w9WgXcQ",  # Rick Astley - Never Gonna Give You Up
    "url_format": "https://www.youtube.com/watch?v=aircAruvnKk"
}


def test_create_video_basic():
    """Test creating a video with just video ID."""
    print("=" * 60)
    print("Test 1: Create Video (Basic)")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["educational"]
    }

    print(f"\n📤 Sending request to: {VIDEO_ENDPOINT}")
    print(f"Video ID: {payload['videoId']}")
    print("⏳ Creating video...\n")

    try:
        response = requests.post(
            VIDEO_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code in (200, 201):
            data = response.json()
            print("✅ Success! Video created.\n")
            print(f"Database ID: {data.get('id')}")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Total Views: {data.get('totalViews')}")
            print(f"Created At: {data.get('createdAt')}")
            print(f"Message: {data.get('message')}")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
        print("Start the server with: python app.py")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_create_video_with_metadata():
    """Test creating a video with metadata fetching."""
    print("\n" + "=" * 60)
    print("Test 2: Create Video with Metadata")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["short_video"],
        "fetchMetadata": True
    }

    print(f"\n📤 Video ID: {payload['videoId']}")
    print("⏳ Creating video and fetching metadata...\n")

    try:
        response = requests.post(
            VIDEO_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code in (200, 201):
            data = response.json()
            print("✅ Success! Video created with metadata.\n")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Description: {data.get('description', '')[:100]}...")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Thumbnail: {data.get('thumbnailUrl')}")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_create_video_with_transcript():
    """Test creating a video with transcript fetching and caching."""
    print("\n" + "=" * 60)
    print("Test 3: Create Video with Transcript")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["educational"],
        "fetchMetadata": True,
        "fetchTranscript": True,
        "languageCodes": ["en"]
    }

    print(f"\n📤 Video ID: {payload['videoId']}")
    print("⏳ Creating video, fetching metadata and transcript...\n")

    try:
        response = requests.post(
            VIDEO_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=60  # Longer timeout for transcript fetch
        )

        if response.status_code in (200, 201):
            data = response.json()
            print("✅ Success! Video created with metadata and transcript.\n")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            
            transcript = data.get('transcript')
            if transcript:
                print(f"\n📝 Transcript cached:")
                print(f"  - Language: {transcript.get('language')} ({transcript.get('languageCode')})")
                print(f"  - Snippet Count: {len(transcript.get('snippets', []))}")
                print(f"  - Cached At: {data.get('transcriptCachedAt')}")
            else:
                print("\n⚠️  No transcript cached")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_get_video():
    """Test getting video with all cached data."""
    print("\n" + "=" * 60)
    print("Test 4: Get Video (with cache)")
    print("=" * 60)

    video_id = TEST_VIDEOS["educational"]
    endpoint = f"{VIDEO_ENDPOINT}/{video_id}"

    print(f"\n📤 Sending request to: {endpoint}")
    print("⏳ Fetching video data...\n")

    try:
        response = requests.get(
            endpoint,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Video data retrieved.\n")
            print(f"Database ID: {data.get('id')}")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Total Views: {data.get('totalViews')}")
            print(f"Language: {data.get('language')}")
            
            print(f"\n📦 Cached Data:")
            print(f"  - Transcript: {'✅ Cached' if data.get('transcript') else '❌ Not cached'}")
            print(f"  - Checkpoints: {'✅ Cached' if data.get('checkpoints') else '❌ Not cached'}")
            print(f"  - Quiz: {'✅ Cached' if data.get('quiz') else '❌ Not cached'}")
            print(f"  - Summary: {'✅ Cached' if data.get('summary') else '❌ Not cached'}")
            
        elif response.status_code == 404:
            print(f"⚠️  Video not found")
            print(f"💡 Tip: Run test_create_video_with_transcript first to create it")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_get_video_metadata():
    """Test fetching YouTube metadata."""
    print("\n" + "=" * 60)
    print("Test 5: Get Video Metadata")
    print("=" * 60)

    video_id = TEST_VIDEOS["short_video"]
    endpoint = f"{VIDEO_ENDPOINT}/{video_id}/metadata"

    print(f"\n📤 Sending request to: {endpoint}")
    print("⏳ Fetching metadata from YouTube...\n")

    try:
        response = requests.get(
            endpoint,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Metadata fetched.\n")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Author: {data.get('author')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Publish Date: {data.get('publishDate')}")
            print(f"Thumbnail: {data.get('thumbnailUrl')}")
            print(f"Cached to DB: {data.get('cached')}")
            
            if data.get('description'):
                desc = data.get('description', '')
                print(f"\nDescription: {desc[:150]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_get_video_metadata_with_cache():
    """Test fetching and caching metadata."""
    print("\n" + "=" * 60)
    print("Test 6: Get Video Metadata (with DB caching)")
    print("=" * 60)

    video_id = TEST_VIDEOS["educational"]
    endpoint = f"{VIDEO_ENDPOINT}/{video_id}/metadata?cache=true"

    print(f"\n📤 Sending request to: {endpoint}")
    print("⏳ Fetching metadata and caching to database...\n")

    try:
        response = requests.get(
            endpoint,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Metadata fetched and cached.\n")
            print(f"YouTube Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
            print(f"Duration: {data.get('durationSeconds')} seconds")
            print(f"Cached to DB: {data.get('cached')}")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def test_create_video_with_url():
    """Test creating video using full YouTube URL."""
    print("\n" + "=" * 60)
    print("Test 7: Create Video with URL")
    print("=" * 60)

    payload = {
        "videoId": TEST_VIDEOS["url_format"],
        "fetchMetadata": True
    }

    print(f"\n📤 URL: {payload['videoId']}")
    print("⏳ Creating video from URL...\n")

    try:
        response = requests.post(
            VIDEO_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )

        if response.status_code in (200, 201):
            data = response.json()
            print("✅ Success! URL parsed and video created.\n")
            print(f"Extracted Video ID: {data.get('youtubeVideoId')}")
            print(f"Title: {data.get('title')}")
        else:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Message: {error_data.get('error', 'Unknown error')}")
            except Exception:
                print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("⏱️  Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error. Is the server running?")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")


def run_all_tests():
    """Run all tests in sequence."""
    print("\n" + "🧪" * 30)
    print("LEARNFLOW VIDEO API TESTS")
    print("🧪" * 30 + "\n")
    
    print("📋 Test Suite: Video Management API (Task 1.4)")
    print(f"🌐 Server: {BASE_URL}")
    print(f"📍 Endpoint: {VIDEO_ENDPOINT}\n")
    
    test_create_video_basic()
    test_create_video_with_metadata()
    test_create_video_with_transcript()
    test_get_video()
    test_get_video_metadata()
    test_get_video_metadata_with_cache()
    test_create_video_with_url()
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
    print("=" * 60)
    print("\n💡 Next Steps:")
    print("  1. Check database: sqlite3 learnflow.db '.tables'")
    print("  2. Verify video records: SELECT * FROM videos;")
    print("  3. Test caching: Second requests should be faster")
    print("  4. Integrate with frontend React app")


if __name__ == "__main__":
    run_all_tests()
