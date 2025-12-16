"""
Centralized LLM client configuration and initialization.
This module provides an LLM client class for interacting with OpenAI's GPT models.
Can be switched back to Gemini by changing LLM_PROVIDER env var.
"""

import os
from openai import OpenAI
from prompts.system import system_instructions


class OpenAIClient:
    """
    Client for interacting with OpenAI's GPT models.
    Handles initialization, configuration, and content generation.
    """

    def __init__(self):
        """
        Initialize the OpenAI client with configuration from environment.

        Raises:
            ValueError: If required environment variables are not set
        """
        self.api_key = os.environ.get("OPENAI_API_KEY")
        self.model_name = os.environ.get("OPENAI_MODEL_NAME", "gpt-4o-mini")

        if not self.api_key:
            raise ValueError(
                "OPENAI_API_KEY not found in environment variables. "
                "Please set it in your .env file."
            )

        self.client = OpenAI(api_key=self.api_key)

    def generate_content(
        self,
        prompt,
        system_instruction=None,
        temperature=0.7,
        **kwargs
    ):
        """
        Generate content from OpenAI (non-streaming).

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
        # Use default system instructions if none provided
        if system_instruction is None:
            system_instruction = system_instructions

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature
        )

        return response.choices[0].message.content

    def generate_content_stream(
        self,
        prompt,
        system_instruction=None,
        temperature=0.7,
        **kwargs
    ):
        """
        Generate streaming content from OpenAI.

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
        # Use default system instructions if none provided
        if system_instruction is None:
            system_instruction = system_instructions

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        stream = self.client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            stream=True
        )

        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Keep Gemini client for easy switching back
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
        from google import genai

        self.api_key = os.environ.get("GEMINI_API_KEY")
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
        """Generate content from LearnLM (non-streaming)."""
        from google.genai import types

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

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
        """Generate streaming content from LearnLM."""
        from google.genai import types

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)]
            )
        ]

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
    Get or create the singleton LLM client instance.

    Uses LLM_PROVIDER env var to select provider:
    - "openai" (default): Use OpenAI GPT models
    - "gemini": Use Google's Gemini/LearnLM models

    Returns:
        OpenAIClient or LearnLMClient: Initialized LLM client

    Raises:
        ValueError: If required API key is not set in environment
    """
    global _client_instance

    if _client_instance is None:
        provider = os.environ.get("LLM_PROVIDER", "openai").lower()

        if provider == "gemini":
            _client_instance = LearnLMClient()
        else:
            _client_instance = OpenAIClient()

    return _client_instance
