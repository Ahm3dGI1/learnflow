"""
Quiz generation prompt for LearnFlow.
Used to generate multiple choice quiz questions from video transcripts.
"""


def get_quiz_prompt(formatted_transcript, num_questions, video_id):
    """
    Generate the prompt for quiz generation.

    Args:
        formatted_transcript (str): Formatted transcript with timestamps
        num_questions (int): Number of questions to generate
        video_id (str): YouTube video ID

    Returns:
        str: Complete prompt for LLM
    """
    return f"""Generate a multiple choice quiz based on this video transcript.

Video Information:
- Video ID: {video_id}
- Number of Questions: {num_questions}

Transcript:
{formatted_transcript}

Instructions:
Generate {num_questions} multiple choice questions that test understanding of the key concepts from this video. Each question should:

1. **Focus on Understanding**: Test comprehension of important concepts, not trivial details
2. **Clear and Specific**: Be clearly worded and unambiguous
3. **Reasonable Difficulty**: Challenge the student without being impossible
4. **Four Options**: Provide exactly 4 answer choices (A, B, C, D)
5. **One Correct Answer**: Have exactly one clearly correct answer
6. **Plausible Distractors**: Include wrong answers that seem reasonable but are incorrect
7. **Distributed Topics**: Cover different parts of the video content

Question Types to Include:
- Conceptual understanding (definitions, explanations)
- Application (how would you use this?)
- Analysis (why does this happen?)
- Comparison (what's the difference between X and Y?)

Output Format:
Respond with ONLY valid JSON in this exact structure:

{{
  "questions": [
    {{
      "question": "Clear question text here?",
      "options": [
        "Option A text",
        "Option B text",
        "Option C text",
        "Option D text"
      ],
      "correctAnswer": 0,
      "explanation": "Brief explanation of why this answer is correct."
    }}
  ]
}}

Notes:
- correctAnswer is the index (0-3) of the correct option in the options array
- Keep questions focused on learning objectives
- Avoid questions that require information not in the transcript
- Each question should be answerable by someone who watched and understood the video

Example for a photosynthesis video:
{{
  "questions": [
    {{
      "question": "What is the primary function of chlorophyll in photosynthesis?",
      "options": [
        "To absorb light energy from the sun",
        "To store glucose for the plant",
        "To release oxygen into the air",
        "To transport water to the leaves"
      ],
      "correctAnswer": 0,
      "explanation": "Chlorophyll is the green pigment that captures light energy, which is the first step in photosynthesis."
    }},
    {{
      "question": "Where do the light-independent reactions of photosynthesis occur?",
      "options": [
        "In the thylakoid membrane",
        "In the stroma of the chloroplast",
        "In the cell nucleus",
        "In the mitochondria"
      ],
      "correctAnswer": 1,
      "explanation": "The Calvin Cycle (light-independent reactions) takes place in the stroma, the fluid-filled space in the chloroplast."
    }}
  ]
}}

Remember: Output ONLY the JSON object, no additional text or explanation."""
