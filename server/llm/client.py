"""
Centralized LearnLM client configuration and initialization.
This module provides a LearnLM client class for interacting with Google's
LearnLM model.
"""

import os
from google import genai
from google.genai import types
from prompts.system import system_instructions


class LearnLMClient:
    """
    Client for interacting with Google's LearnLM model.
    Handles initialization, configuration, and content generation.
    """

    def __init__(self):
        """
        Initialize the LearnLM client with configuration from environment.

        Raises:
            ValueError: If required environment variables are not set
        """
        self.api_key = os.environ.get("GEMINI_API_KEY")
        # Switching to generic alias `gemini-flash-latest` which is explicitly listed as available
        self.model_name = "gemini-flash-latest"

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY not found in environment variables. "
                "Please set it in your .env file."
            )

        self.client = genai.Client(api_key=self.api_key)

    def generate_content(
        self,
        prompt,
        system_instruction=None,
        temperature=0.7,
        **kwargs
    ):
        """
        Generate content from LearnLM (non-streaming).

        Args:
            prompt (str): User prompt/input text
            system_instruction (str, optional): System instruction for model
                If None, uses default LearnFlow system instructions
            temperature (float): Temperature for generation (default: 0.7)
            **kwargs: Additional configuration parameters

        Returns:
            str: Complete response text from the model

        Raises:
            Exception: If content generation fails
        """
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        # Use default system instructions if none provided
        if system_instruction is None:
            system_instruction = system_instructions

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            **kwargs
        )

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=contents,
            config=config
        )

        return response.text

    def generate_content_stream(
        self,
        prompt,
        system_instruction=None,
        temperature=0.7,
        **kwargs
    ):
        """
        Generate streaming content from LearnLM.

        Args:
            prompt (str): User prompt/input text
            system_instruction (str, optional): System instruction for model
                If None, uses default LearnFlow system instructions
            temperature (float): Temperature for generation (default: 0.7)
            **kwargs: Additional configuration parameters

        Yields:
            str: Text chunks from the model's response

        Raises:
            Exception: If content generation fails
        """
        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

        # Use default system instructions if none provided
        if system_instruction is None:
            system_instruction = system_instructions

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=temperature,
            **kwargs
        )

        for chunk in self.client.models.generate_content_stream(
            model=self.model_name,
            contents=contents,
            config=config
        ):
            if chunk.text:
                yield chunk.text


# Singleton instance
_client_instance = None


def get_client():
    """
    Get or create the singleton LearnLM client instance.

    Returns:
        LearnLMClient: Initialized LearnLM client

    Raises:
        ValueError: If GEMINI_API_KEY is not set in environment
    """
    global _client_instance

    if _client_instance is None:
        _client_instance = LearnLMClient()

    return _client_instance
