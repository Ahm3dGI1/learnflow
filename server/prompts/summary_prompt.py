"""
Summary generation prompt for LearnFlow.
Used to generate concise video summaries from transcripts.
"""


def get_summary_prompt(video_id, language, duration, formatted_transcript):
    """
    Generate the prompt for summary generation.

    Args:
        video_id (str): YouTube video ID
        language (str): Video language
        duration (str): Total video duration (MM:SS format)
        formatted_transcript (str): Formatted transcript with timestamps

    Returns:
        str: Complete prompt for LLM
    """
    return f"""Analyze this video transcript and generate a concise, informative summary.

Video Information:
- Video ID: {video_id}
- Language: {language}
- Duration: {duration}

Transcript:
{formatted_transcript}

Instructions:
Generate a clear, well-structured summary that captures the essence of the video content. The summary should:

1. **Length**: Be 2-3 paragraphs, approximately 150 words total
2. **Structure**: Start with an overview, then cover main points, and conclude with key takeaways
3. **Content Focus**: Emphasize the core concepts, important information, and learning objectives
4. **Clarity**: Use clear, accessible language appropriate for learners
5. **Completeness**: Give readers a solid understanding of what the video covers without watching it

Guidelines:
- Focus on substantive content, not video production details
- Avoid phrases like "In this video" or "The presenter explains" - be direct
- Highlight key concepts, definitions, processes, or arguments presented
- Mention any important examples or case studies if they're central to understanding
- Conclude with the main takeaway or practical application if applicable

Output Format:
Respond with ONLY valid JSON in this exact structure:

{{
  "summary": "Your 2-3 paragraph summary text here. Each paragraph should flow naturally and cover distinct aspects of the content. The summary should be informative and give a clear picture of what viewers will learn."
}}

Example for a photosynthesis video:
{{
  "summary": "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose molecules. This occurs in two main stages: the light-dependent reactions and the light-independent reactions (Calvin Cycle). Light-dependent reactions take place in the thylakoid membranes where chlorophyll captures sunlight and splits water molecules, producing oxygen as a byproduct and generating ATP and NADPH.\\n\\nThe Calvin Cycle occurs in the stroma and uses the ATP and NADPH from the light reactions to fix carbon dioxide into glucose through a series of enzymatic reactions. The cycle repeats multiple times to build complete glucose molecules.\\n\\nUnderstanding photosynthesis is fundamental to biology as it explains how plants produce food and oxygen, supporting nearly all life on Earth. The process demonstrates the elegant conversion of solar energy into a form that can be used by living organisms."
}}

Remember: Output ONLY the JSON object with the "summary" field, no additional text or explanation."""
