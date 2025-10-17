const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Mock quiz data - just hardcoded for now
const mockQuizzes = {
  '1': {
    id: '1',
    videoId: 'sample-video-1',
    questions: [
      {
        id: 1,
        question: "What is the main topic of this video?",
        options: [
          "Programming basics",
          "Data structures",
          "Web development",
          "Machine learning"
        ],
        correctAnswer: 0
      },
      {
        id: 2,
        question: "Which concept was explained first?",
        options: [
          "Variables",
          "Functions",
          "Loops",
          "Arrays"
        ],
        correctAnswer: 0
      }
    ]
  }
};

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'LearnFlow Quiz API is running' });
});

// Get quiz by ID (returns mock data for now)
app.get('/api/quiz/:id', (req, res) => {
  const quizId = req.params.id;
  const quiz = mockQuizzes[quizId];
  
  if (quiz) {
    res.json(quiz);
  } else {
    res.status(404).json({ error: 'Quiz not found' });
  }
});

// Generate quiz from transcript (mock for now)
app.post('/api/quiz/generate', (req, res) => {
  const { transcript, videoId } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }
  
  // For now, just return mock quiz
  // Later: integrate AI API to actually generate questions
  const mockGeneratedQuiz = {
    id: Date.now().toString(),
    videoId: videoId || 'unknown',
    questions: [
      {
        id: 1,
        question: "Based on the transcript, what was discussed?",
        options: [
          "Option A",
          "Option B",
          "Option C",
          "Option D"
        ],
        correctAnswer: 0
      }
    ]
  };
  
  res.json(mockGeneratedQuiz);
});

// Submit quiz answers
app.post('/api/quiz/submit', (req, res) => {
  const { quizId, answers } = req.body;
  
  if (!quizId || !answers) {
    return res.status(400).json({ error: 'Quiz ID and answers are required' });
  }
  
  // Mock grading - just return a fake score
  const score = Math.floor(Math.random() * 100);
  
  res.json({
    quizId,
    score,
    totalQuestions: answers.length,
    correctAnswers: Math.floor(answers.length * (score / 100))
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
