"""Lightweight mock backend for LearnFlow quiz interactions.

This module exposes a small Flask application that simulates the quiz-related
workflow while the production backend is under development. It offers:
    - A health-check endpoint so deployment platforms can verify availability.
    - Endpoints to fetch or "generate" quizzes backed by deterministic mock
      data stored in memory.
    - A submission endpoint that produces a synthetic score for client demos.

The intent is to keep the logic approachable for students (#cs110-CodeReadability)
by favouring descriptive naming, explicit error messages, and structured
docstrings. Replace these mocks with real implementations once the backend is
ready to integrate with AI services.
"""

from __future__ import annotations

import os
import random
from typing import Any, Dict, List, MutableMapping, Tuple

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

PORT: int = int(os.getenv("PORT", 5000))

Question = Dict[str, Any]
Quiz = Dict[str, Any]

MOCK_QUIZZES: MutableMapping[str, Quiz] = {
    "1": {
        "id": "1",
        "videoId": "sample-video-1",
        "questions": [
            {
                "id": 1,
                "question": "What is the main topic of this video?",
                "options": [
                    "Programming basics",
                    "Data structures",
                    "Web development",
                    "Machine learning",
                ],
                "correctAnswer": 0,
            },
            {
                "id": 2,
                "question": "Which concept was explained first?",
                "options": ["Variables", "Functions", "Loops", "Arrays"],
                "correctAnswer": 0,
            },
        ],
    }
}


@app.route("/")
def health_check():
    """Return a simple response indicating the service is alive."""
    return jsonify({"message": "LearnFlow Quiz API is running"})


@app.route("/api/quiz/<quiz_id>")
def get_quiz(quiz_id: str):
    """Fetch a quiz by identifier or respond with a 404 error."""
    quiz = MOCK_QUIZZES.get(quiz_id)
    if quiz:
        return jsonify(quiz)
    return jsonify({"error": "Quiz not found"}), 404


def _build_mock_question(prompt: str) -> Question:
    """Create a placeholder question given a textual prompt."""
    options = ["Option A", "Option B", "Option C", "Option D"]
    return {
        "id": 1,
        "question": prompt,
        "options": options,
        "correctAnswer": 0,
    }


def _mock_quiz_payload(video_id: str) -> Quiz:
    """Generate a deterministic mock quiz payload for the given video id."""
    return {
        "id": str(random.randint(1000, 9999)),
        "videoId": video_id,
        "questions": [
            _build_mock_question("Based on the transcript, what was discussed?")
        ],
    }


@app.route("/api/quiz/generate", methods=["POST"])
def generate_quiz():
    """Return a mock quiz generated from a provided transcript snippet."""
    payload = request.get_json(silent=True) or {}
    transcript: str | None = payload.get("transcript")
    video_id: str = payload.get("videoId", "unknown")

    if not transcript or not transcript.strip():
        return jsonify({"error": "Transcript is required"}), 400

    mock_quiz = _mock_quiz_payload(video_id)
    return jsonify(mock_quiz)


def _mock_grade_submission(answer_count: int) -> Tuple[int, int]:
    """Produce a deterministic mock score tuple for a submission."""
    if answer_count <= 0:
        return 0, 0

    score = min(100, 60 + answer_count * 10)
    correct_ratio = score / 100
    correct_answers = min(answer_count, max(0, round(answer_count * correct_ratio)))
    return score, correct_answers


@app.route("/api/quiz/submit", methods=["POST"])
def submit_quiz():
    """Evaluate a quiz submission and return a mock scoring summary."""
    payload = request.get_json(silent=True) or {}
    quiz_id: str | None = payload.get("quizId")
    answers: List[Any] | None = payload.get("answers")

    if not quiz_id or not answers:
        return jsonify({"error": "Quiz ID and answers are required"}), 400

    score, correct_answers = _mock_grade_submission(len(answers))
    return jsonify(
        {
            "quizId": quiz_id,
            "score": score,
            "totalQuestions": len(answers),
            "correctAnswers": correct_answers,
        }
    )


if __name__ == "__main__":
    print(f"Server running on http://localhost:{PORT}")
    app.run(debug=True, port=PORT)
