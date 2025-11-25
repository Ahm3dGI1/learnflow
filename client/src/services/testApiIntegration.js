/**
 * Test script for API integration
 * Run this to verify backend connectivity and service functionality
 */

import api from './api';
import videoService from './videoService';
import llmService from './llmService';

/**
 * Test API health check
 */
async function testHealthCheck() {
  console.log('\n=== Testing Health Check ===');
  try {
    const response = await api.healthCheck();
    console.log('✅ Health check passed:', response);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

/**
 * Test video transcript fetching
 */
async function testTranscriptFetch() {
  console.log('\n=== Testing Transcript Fetch ===');
  const testVideoId = 'dQw4w9WgXcQ'; // Rick Astley - Never Gonna Give You Up

  try {
    const transcript = await videoService.fetchTranscript(testVideoId);
    console.log('✅ Transcript fetched successfully');
    console.log(`   Video ID: ${transcript.videoId}`);
    console.log(`   Language: ${transcript.language} (${transcript.languageCode})`);
    console.log(`   Snippets: ${transcript.snippets.length}`);
    console.log(`   Duration: ${transcript.durationSeconds}s`);
    console.log(`   Is Generated: ${transcript.isGenerated}`);
    return transcript;
  } catch (error) {
    console.error('❌ Transcript fetch failed:', error.message);
    return null;
  }
}

/**
 * Test video ID extraction
 */
async function testVideoIdExtraction() {
  console.log('\n=== Testing Video ID Extraction ===');
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'dQw4w9WgXcQ',
  ];

  let allPassed = true;

  for (const url of testUrls) {
    try {
      const result = await videoService.extractVideoId(url);
      console.log(`✅ Extracted from "${url}": ${result.videoId}`);
    } catch (error) {
      console.error(`❌ Failed to extract from "${url}":`, error.message);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test available transcripts listing
 */
async function testListTranscripts() {
  console.log('\n=== Testing List Available Transcripts ===');
  const testVideoId = 'aircAruvnKk'; // 3Blue1Brown video

  try {
    const result = await videoService.listAvailableTranscripts(testVideoId);
    console.log('✅ Available transcripts fetched');
    console.log(`   Video ID: ${result.videoId}`);
    console.log(`   Available languages: ${result.transcripts.length}`);
    result.transcripts.forEach((t) => {
      console.log(
        `   - ${t.language} (${t.languageCode}): ${t.isGenerated ? 'Auto-generated' : 'Manual'}`
      );
    });
    return true;
  } catch (error) {
    console.error('❌ List transcripts failed:', error.message);
    return false;
  }
}

/**
 * Test video metadata fetching
 */
async function testVideoMetadata() {
  console.log('\n=== Testing Video Metadata Fetch ===');
  const testVideoId = 'dQw4w9WgXcQ';

  try {
    const metadata = await videoService.getVideoMetadata(testVideoId, false);
    console.log('✅ Video metadata fetched');
    console.log(`   Video ID: ${metadata.youtubeVideoId}`);
    console.log(`   Title: ${metadata.title || 'N/A'}`);
    console.log(`   Duration: ${metadata.durationSeconds}s`);
    console.log(`   Author: ${metadata.author || 'N/A'}`);
    console.log(`   Cached: ${metadata.cached}`);
    return true;
  } catch (error) {
    console.error('❌ Video metadata fetch failed:', error.message);
    return false;
  }
}

/**
 * Test create video
 */
async function testCreateVideo() {
  console.log('\n=== Testing Create Video ===');
  const testVideoId = 'dQw4w9WgXcQ';

  try {
    const video = await videoService.createVideo(testVideoId, {
      fetchMetadata: true,
      fetchTranscript: false,
    });
    console.log('✅ Video created');
    console.log(`   Video ID: ${video.youtubeVideoId}`);
    console.log(`   Has metadata: ${!!video.title}`);
    return true;
  } catch (error) {
    console.error('❌ Create video failed:', error.message);
    return false;
  }
}

/**
 * Test get video with cache
 */
async function testGetVideo() {
  console.log('\n=== Testing Get Video with Cache ===');
  const testVideoId = 'dQw4w9WgXcQ';

  try {
    const video = await videoService.getVideo(testVideoId);
    console.log('✅ Video retrieved');
    console.log(`   Video ID: ${video.youtubeVideoId}`);
    console.log(`   Has transcript: ${!!video.transcript}`);
    console.log(`   Has checkpoints: ${!!video.checkpoints}`);
    console.log(`   Has quiz: ${!!video.quiz}`);
    return true;
  } catch (error) {
    // 404 is expected if video hasn't been created yet
    if (error.status === 404) {
      console.log('⚠️  Video not found in database (expected if not created yet)');
      return true;
    }
    console.error('❌ Get video failed:', error.message);
    return false;
  }
}

/**
 * Test checkpoint generation
 */
async function testCheckpointGeneration(transcript) {
  console.log('\n=== Testing Checkpoint Generation ===');

  if (!transcript) {
    console.log('⚠️  Skipping checkpoint test (no transcript available)');
    return false;
  }

  try {
    const checkpoints = await llmService.generateCheckpoints(transcript, {
      numCheckpoints: 3,
    });
    console.log('✅ Checkpoints generated successfully');
    console.log(`   Number of checkpoints: ${checkpoints.checkpoints.length}`);
    checkpoints.checkpoints.forEach((cp, index) => {
      console.log(`   ${index + 1}. [${videoService.formatTimestamp(cp.timestamp)}] ${cp.title}`);
    });
    return checkpoints;
  } catch (error) {
    console.error('❌ Checkpoint generation failed:', error.message);
    return null;
  }
}

/**
 * Test quiz generation
 */
async function testQuizGeneration(transcript) {
  console.log('\n=== Testing Quiz Generation ===');

  if (!transcript) {
    console.log('⚠️  Skipping quiz test (no transcript available)');
    return false;
  }

  try {
    const quiz = await llmService.generateQuiz(transcript, {
      numQuestions: 3,
    });
    console.log('✅ Quiz generated successfully');
    console.log(`   Quiz ID: ${quiz.quizId || 'N/A'}`);
    console.log(`   Number of questions: ${quiz.questions.length}`);
    quiz.questions.forEach((q, index) => {
      console.log(`   ${index + 1}. ${q.question}`);
      q.options.forEach((opt) => {
        console.log(`      ${opt}`);
      });
    });
    return quiz;
  } catch (error) {
    console.error('❌ Quiz generation failed:', error.message);
    return null;
  }
}

/**
 * Test LLM health check
 */
async function testLLMHealth() {
  console.log('\n=== Testing LLM Service Health ===');
  try {
    const response = await llmService.healthCheck();
    console.log('✅ LLM health check passed:', response);
    return true;
  } catch (error) {
    console.error('❌ LLM health check failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║   LearnFlow API Integration Test Suite       ║');
  console.log('╚═══════════════════════════════════════════════╝');

  const results = {
    healthCheck: false,
    llmHealth: false,
    videoIdExtraction: false,
    transcriptFetch: false,
    listTranscripts: false,
    videoMetadata: false,
    createVideo: false,
    getVideo: false,
    checkpointGeneration: false,
    quizGeneration: false,
  };

  // Test 1: Health check
  results.healthCheck = await testHealthCheck();

  // Test 2: LLM health
  results.llmHealth = await testLLMHealth();

  // Test 3: Video ID extraction
  results.videoIdExtraction = await testVideoIdExtraction();

  // Test 4: Transcript fetch
  const transcript = await testTranscriptFetch();
  results.transcriptFetch = transcript !== null;

  // Test 5: List transcripts
  results.listTranscripts = await testListTranscripts();

  // Test 6: Video metadata
  results.videoMetadata = await testVideoMetadata();

  // Test 7: Create video
  results.createVideo = await testCreateVideo();

  // Test 8: Get video
  results.getVideo = await testGetVideo();

  // Test 9: Checkpoint generation (requires transcript)
  const checkpoints = await testCheckpointGeneration(transcript);
  results.checkpointGeneration = checkpoints !== null;

  // Test 10: Quiz generation (requires transcript)
  const quiz = await testQuizGeneration(transcript);
  results.quizGeneration = quiz !== null;

  // Summary
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║              Test Results Summary             ║');
  console.log('╚═══════════════════════════════════════════════╝');

  const testNames = [
    'Health Check',
    'LLM Health Check',
    'Video ID Extraction',
    'Transcript Fetch',
    'List Transcripts',
    'Video Metadata',
    'Create Video',
    'Get Video',
    'Checkpoint Generation',
    'Quiz Generation',
  ];

  const testKeys = Object.keys(results);
  testKeys.forEach((key, index) => {
    const status = results[key] ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testNames[index]}`);
  });

  const passedCount = Object.values(results).filter((r) => r).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n📊 Results: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('🎉 All tests passed! API integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the backend server and configuration.');
  }

  return results;
}

// Export individual test functions
export {
  testHealthCheck,
  testLLMHealth,
  testVideoIdExtraction,
  testTranscriptFetch,
  testListTranscripts,
  testVideoMetadata,
  testCreateVideo,
  testGetVideo,
  testCheckpointGeneration,
  testQuizGeneration,
};
