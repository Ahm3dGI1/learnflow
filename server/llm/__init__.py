"""
LearnFlow LLM Integration Module
Provides centralized access to Google's LearnLM model.
"""

from .client import LearnLMClient, get_client

__all__ = ['LearnLMClient', 'get_client']
