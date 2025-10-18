from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import random

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get port from environment or default to 5000
PORT = int(os.getenv('PORT', 5000))

# Mock quiz data - just hardcoded for now
mock_quizzes = {
    '1': {
        'id': '1',
        'videoId': 'sample-video-1',
        'questions': [
            {
                'id': 1,
                'question': "What is the main topic of this video?",
                'options': [
                    "Programming basics",
                    "Data structures", 
                    "Web development",
                    "Machine learning"
                ],
                'correctAnswer': 0
            },
            {
                'id': 2,
                'question': "Which concept was explained first?",
                'options': [
                    "Variables",
                    "Functions",
                    "Loops", 
                    "Arrays"
                ],
                'correctAnswer': 0
            }
        ]
    }
}

# Routes

# Health check
@app.route('/')
def health_check():
    return jsonify({'message': 'LearnFlow Quiz API is running'})

# Get quiz by ID (returns mock data for now)
@app.route('/api/quiz/<quiz_id>')
def get_quiz(quiz_id):
    quiz = mock_quizzes.get(quiz_id)
    
    if quiz:
        return jsonify(quiz)
    else:
        return jsonify({'error': 'Quiz not found'}), 404

# Generate quiz from transcript (mock for now)
@app.route('/api/quiz/generate', methods=['POST'])
def generate_quiz():
    data = request.get_json()
    transcript = data.get('transcript')
    video_id = data.get('videoId', 'unknown')
    
    if not transcript:
        return jsonify({'error': 'Transcript is required'}), 400
    
    # For now, just return mock quiz
    # Later: integrate AI API to actually generate questions
    mock_generated_quiz = {
        'id': str(random.randint(1000, 9999)),
        'videoId': video_id,
        'questions': [
            {
                'id': 1,
                'question': "Based on the transcript, what was discussed?",
                'options': [
                    "Option A",
                    "Option B", 
                    "Option C",
                    "Option D"
                ],
                'correctAnswer': 0
            }
        ]
    }
    
    return jsonify(mock_generated_quiz)

# Submit quiz answers
@app.route('/api/quiz/submit', methods=['POST'])
def submit_quiz():
    data = request.get_json()
    quiz_id = data.get('quizId')
    answers = data.get('answers')
    
    if not quiz_id or not answers:
        return jsonify({'error': 'Quiz ID and answers are required'}), 400
    
    # Mock grading - just return a fake score
    score = random.randint(0, 100)
    
    return jsonify({
        'quizId': quiz_id,
        'score': score,
        'totalQuestions': len(answers),
        'correctAnswers': int(len(answers) * (score / 100))
    })

if __name__ == '__main__':
    print(f"Server running on http://localhost:{PORT}")
    app.run(debug=True, port=PORT)
