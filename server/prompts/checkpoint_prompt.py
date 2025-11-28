"""
Checkpoint generation prompt for LearnFlow.
Used to generate learning checkpoints from video transcripts.
"""


def get_checkpoint_prompt(video_id, language, duration, formatted_transcript):
    """
    Generate the prompt for checkpoint generation.

    Args:
        video_id (str): YouTube video ID
        language (str): Video language
        duration (str): Total video duration (MM:SS format)
        formatted_transcript (str): Formatted transcript with timestamps

    Returns:
        str: Complete prompt for LLM
    """
    return f"""Analyze this video transcript and generate learning checkpoints at key conceptual transitions.

Video Information:
- Video ID: {video_id}
- Language: {language}
- Duration: {duration}

Transcript:
{formatted_transcript}

Instructions:
Generate 5-8 checkpoints that mark important moments in the learning content. Each checkpoint should:

1. **Timing**: Be placed at moments when a new concept, subtopic, or key idea begins
2. **Title**: Have a clear, concise title (3-6 words) that captures the main concept
3. **Subtopic**: Include a brief description (one sentence, 10-20 words) explaining what will be covered
4. **Spacing**: Be distributed appropriately throughout the video - avoid clustering multiple checkpoints too close together (minimum 90-120 seconds apart for videos longer than 10 minutes)
5. **Relevance**: Focus on conceptual transitions, not superficial topic changes

Guidelines:
- For shorter videos (< 5 min): Generate 3-5 checkpoints
- For medium videos (5-15 min): Generate 5-7 checkpoints
- For longer videos (> 15 min): Generate 6-8 checkpoints
- Skip introductions/outros unless they contain substantial content
- Prioritize moments where understanding is crucial before proceeding

Output Format:
Respond with ONLY valid JSON in this exact structure:

{{
  "checkpoints": [
    {{
      "timestamp": "MM:SS",
      "title": "Short Title Here",
      "subtopic": "Brief one-sentence description of what this section covers.",
      "question": "A question to verify understanding of this checkpoint's content.",
      "answer": "The correct answer to the question."
    }}
  ]
}}

Example for a photosynthesis video:
{{
  "checkpoints": [
    {{
      "timestamp": "02:15",
      "title": "Photosynthesis Definition",
      "subtopic": "Understanding what photosynthesis is and why plants need it.",
      "question": "What is the primary purpose of photosynthesis in plants?",
      "answer": "To convert light energy into chemical energy stored in glucose"
    }},
    {{
      "timestamp": "05:40",
      "title": "Light-Dependent Reactions",
      "subtopic": "How chlorophyll captures light energy in the thylakoid membrane.",
      "question": "Where do the light-dependent reactions occur?",
      "answer": "In the thylakoid membrane"
    }},
    {{
      "timestamp": "08:20",
      "title": "Calvin Cycle Process",
      "subtopic": "Converting carbon dioxide into glucose using ATP and NADPH.",
      "question": "What molecule is produced as the end product of the Calvin Cycle?",
      "answer": "Glucose"
    }}
  ]
}}

Remember: Output ONLY the JSON object, no additional text or explanation."""
