/**
 * Unit tests for ChatInterface component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from '../ChatInterface';
import { useAuth } from '../../auth/AuthContext';
import { llmService, videoService } from '../../services';

// Mock the auth context
jest.mock('../../auth/AuthContext');

// Mock the services
jest.mock('../../services', () => ({
  llmService: {
    getChatHistory: jest.fn(),
    sendChatMessageStream: jest.fn(),
  },
  videoService: {
    fetchTranscript: jest.fn(),
    formatTranscriptText: jest.fn(),
  },
}));

// Mock CSS imports
jest.mock('../../pages/Auth.css', () => ({}));
jest.mock('../ChatInterface.css', () => ({}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

describe('ChatInterface', () => {
  const mockUser = {
    id: 'user123',
    uid: 'firebase-uid-123',
    email: 'test@example.com',
  };

  const mockVideoId = 'video123';
  const mockVideoTitle = 'Test Video Title';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    useAuth.mockReturnValue({ user: mockUser });
    llmService.getChatHistory.mockResolvedValue({ messages: [] });
    videoService.fetchTranscript.mockResolvedValue({
      snippets: [{ text: 'Test transcript content' }],
      languageCode: 'en',
    });
    videoService.formatTranscriptText.mockReturnValue('Test transcript content');
  });

  // ========== RENDERING TESTS ==========

  describe('Rendering', () => {
    test('renders chat interface with header and placeholder', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
      expect(screen.getByText('Ask questions about the video content')).toBeInTheDocument();
      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText("I'm your AI Tutor. Ask me anything about this video!")).toBeInTheDocument();
    });

    test('renders input field and send button', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      expect(screen.getByPlaceholderText('Type your question...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    test('renders emoji icons correctly', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      expect(screen.getByText('💬')).toBeInTheDocument();
      expect(screen.getByText('👋')).toBeInTheDocument();
    });

    test('input has correct aria-label when user is logged in', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Type your question to AI Tutor');
    });

    test('input has correct aria-label when user is not logged in', () => {
      useAuth.mockReturnValue({ user: null });
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Please log in to chat');
    });
  });

  // ========== CHAT HISTORY LOADING TESTS ==========

  describe('Chat History Loading', () => {
    test('fetches and displays chat history on mount', async () => {
      const mockHistory = {
        messages: [
          { role: 'user', message: 'What is photosynthesis?', timestamp_context: '05:30' },
          { role: 'assistant', message: 'Photosynthesis is the process by which plants convert light energy into chemical energy.', timestamp_context: '05:30' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(llmService.getChatHistory).toHaveBeenCalledWith(mockVideoId, mockUser.id);
      });

      await waitFor(() => {
        expect(screen.getByText('What is photosynthesis?')).toBeInTheDocument();
        expect(screen.getByText('Photosynthesis is the process by which plants convert light energy into chemical energy.')).toBeInTheDocument();
      });

      // Placeholder should not be visible when messages exist
      expect(screen.queryByText('Hello!')).not.toBeInTheDocument();
    });

    test('uses user.uid if user.id is not available', async () => {
      useAuth.mockReturnValue({ user: { uid: 'firebase-uid-456' } });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(llmService.getChatHistory).toHaveBeenCalledWith(mockVideoId, 'firebase-uid-456');
      });
    });

    test('does not fetch history if user is not logged in', async () => {
      useAuth.mockReturnValue({ user: null });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(llmService.getChatHistory).not.toHaveBeenCalled();
      });
    });

    test('does not fetch history if videoId is missing', async () => {
      render(<ChatInterface videoId={null} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(llmService.getChatHistory).not.toHaveBeenCalled();
      });
    });

    test('handles chat history fetch error gracefully', async () => {
      llmService.getChatHistory.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load chat history:',
          expect.any(Error)
        );
      });

      // Should still render placeholder
      expect(screen.getByText('Hello!')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    test('displays assistant messages with "Tutor" label', async () => {
      const mockHistory = {
        messages: [
          { role: 'assistant', message: 'Hello! How can I help you?', timestamp_context: '00:00' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(screen.getByText('Tutor')).toBeInTheDocument();
        expect(screen.getByText('Hello! How can I help you?')).toBeInTheDocument();
      });
    });

    test('does not display "Tutor" label for user messages', async () => {
      const mockHistory = {
        messages: [
          { role: 'user', message: 'What is this about?', timestamp_context: '00:00' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(screen.getByText('What is this about?')).toBeInTheDocument();
      });

      expect(screen.queryByText('Tutor')).not.toBeInTheDocument();
    });
  });

  // ========== TRANSCRIPT LOADING TESTS ==========

  describe('Transcript Loading', () => {
    test('fetches transcript on mount', async () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(videoService.fetchTranscript).toHaveBeenCalledWith(mockVideoId);
      });
    });

    test('does not fetch transcript if videoId is missing', async () => {
      render(<ChatInterface videoId={null} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(videoService.fetchTranscript).not.toHaveBeenCalled();
      });
    });

    test('handles transcript fetch error gracefully', async () => {
      videoService.fetchTranscript.mockRejectedValue(new Error('Transcript not available'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to load transcript for chat context:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    test('formats transcript text correctly', async () => {
      const mockSnippets = [
        { text: 'Part 1', start: 0 },
        { text: 'Part 2', start: 10 },
      ];
      const formattedText = 'Part 1 Part 2';

      videoService.fetchTranscript.mockResolvedValue({
        snippets: mockSnippets,
        languageCode: 'en',
      });
      videoService.formatTranscriptText.mockReturnValue(formattedText);

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(videoService.formatTranscriptText).toHaveBeenCalledWith(mockSnippets);
      });
    });
  });

  // ========== USER INPUT TESTS ==========

  describe('User Input', () => {
    test('allows typing in the input field', async () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');

      expect(input).toHaveValue('Test message');
    });

    test('clears input field when onChange is triggered', async () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      expect(input).toHaveValue('Test message');

      await userEvent.clear(input);
      expect(input).toHaveValue('');
    });

    test('disables input when user is not logged in', () => {
      useAuth.mockReturnValue({ user: null });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Please log in to chat');
      expect(input).toBeDisabled();
    });

    test('disables send button when input is empty', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });

    test('enables send button when input has text', async () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const sendButton = screen.getByRole('button', { name: 'Send' });

      await userEvent.type(input, 'Test message');
      expect(sendButton).not.toBeDisabled();
    });

    test('disables send button when user is not logged in', () => {
      useAuth.mockReturnValue({ user: null });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const sendButton = screen.getByRole('button', { name: 'Send' });
      expect(sendButton).toBeDisabled();
    });
  });

  // ========== MESSAGE SUBMISSION TESTS ==========

  describe('Message Submission', () => {
    test('sends message and displays it when form is submitted', async () => {
      llmService.sendChatMessageStream.mockImplementation((message, context, onChunk) => {
        onChunk('AI response');
        return Promise.resolve();
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const sendButton = screen.getByRole('button', { name: 'Send' });

      await userEvent.type(input, 'What is the answer?');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('What is the answer?')).toBeInTheDocument();
      });
    });

    test('clears input field after message is sent', async () => {
      llmService.sendChatMessageStream.mockImplementation((message, context, onChunk) => {
        onChunk('AI response');
        return Promise.resolve();
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('displays loading indicator while waiting for response', async () => {
      llmService.sendChatMessageStream.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      // Check for loading dots
      await waitFor(() => {
        const dots = screen.getAllByText('•');
        expect(dots.length).toBe(3);
      });
    });

    test('displays streamed response chunks progressively', async () => {
      llmService.sendChatMessageStream.mockImplementation(async (message, context, onChunk) => {
        onChunk('First ');
        onChunk('second ');
        onChunk('third');
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Tell me more');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText('First second third')).toBeInTheDocument();
      });
    });

    test('does not submit empty or whitespace-only messages', async () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, '   ');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(llmService.sendChatMessageStream).not.toHaveBeenCalled();
      });
    });

    test('prevents multiple submissions while loading', async () => {
      llmService.sendChatMessageStream.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 100));
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'First message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      // Try to submit again immediately
      await userEvent.type(input, 'Second message');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(llmService.sendChatMessageStream).toHaveBeenCalledTimes(1);
      });
    });

    test('sends correct video context with message', async () => {
      const mockTranscript = 'This is the full transcript text';
      videoService.fetchTranscript.mockResolvedValue({
        snippets: [{ text: mockTranscript }],
        languageCode: 'en',
      });
      videoService.formatTranscriptText.mockReturnValue(mockTranscript);

      llmService.sendChatMessageStream.mockImplementation((message, context, onChunk) => {
        onChunk('Response');
        return Promise.resolve();
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      // Wait for transcript to load
      await waitFor(() => {
        expect(videoService.fetchTranscript).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test question');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(llmService.sendChatMessageStream).toHaveBeenCalledWith(
          'Test question',
          {
            videoId: mockVideoId,
            videoContext: expect.objectContaining({
              videoId: mockVideoId,
              videoTitle: mockVideoTitle,
              language: 'en',
              fullTranscript: mockTranscript,
              transcriptSnippet: '',
            }),
          },
          expect.any(Function)
        );
      });
    });

    test('trims transcript to character limit', async () => {
      const longTranscript = 'a'.repeat(15000);
      videoService.fetchTranscript.mockResolvedValue({
        snippets: [{ text: longTranscript }],
        languageCode: 'en',
      });
      videoService.formatTranscriptText.mockReturnValue(longTranscript);

      llmService.sendChatMessageStream.mockImplementation((message, context, onChunk) => {
        onChunk('Response');
        return Promise.resolve();
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(videoService.fetchTranscript).toHaveBeenCalled();
      });

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(llmService.sendChatMessageStream).toHaveBeenCalledWith(
          'Test',
          expect.objectContaining({
            videoContext: expect.objectContaining({
              fullTranscript: expect.stringMatching(/^a{12000}$/), // Exactly 12000 characters
            }),
          }),
          expect.any(Function)
        );
      });
    });
  });

  // ========== ERROR HANDLING TESTS ==========

  describe('Error Handling', () => {
    test('displays error message when chat request fails', async () => {
      llmService.sendChatMessageStream.mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error: Network error/)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test('displays generic error message when error has no message', async () => {
      llmService.sendChatMessageStream.mockRejectedValue({});
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error. Please try again later./)).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test('re-enables input after error', async () => {
      llmService.sendChatMessageStream.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message');
      
      const form = input.closest('form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
      });

      // Input should be enabled again
      expect(input).not.toBeDisabled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ========== MESSAGE DISPLAY TESTS ==========

  describe('Message Display', () => {
    test('applies correct CSS classes to user messages', async () => {
      const mockHistory = {
        messages: [
          { role: 'user', message: 'User question', timestamp_context: '00:00' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      const { container } = render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        const userMessage = container.querySelector('.message-user');
        expect(userMessage).toHaveClass('message-bubble', 'message-user');
        expect(screen.getByText('User question')).toBeInTheDocument();
      });
    });

    test('applies correct CSS classes to assistant messages', async () => {
      const mockHistory = {
        messages: [
          { role: 'assistant', message: 'AI response', timestamp_context: '00:00' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      const { container } = render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        const assistantMessage = container.querySelector('.message-assistant');
        expect(assistantMessage).toHaveClass('message-bubble', 'message-assistant');
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });
    });

    test('hides placeholder when messages exist', async () => {
      const mockHistory = {
        messages: [
          { role: 'user', message: 'Test', timestamp_context: '00:00' },
        ],
      };

      llmService.getChatHistory.mockResolvedValue(mockHistory);

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      await waitFor(() => {
        expect(screen.queryByText('Hello!')).not.toBeInTheDocument();
      });
    });

    test('shows placeholder when no messages', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      expect(screen.getByText('Hello!')).toBeInTheDocument();
      expect(screen.getByText("I'm your AI Tutor. Ask me anything about this video!")).toBeInTheDocument();
    });
  });

  // ========== ACCESSIBILITY TESTS ==========

  describe('Accessibility', () => {
    test('form can be submitted with Enter key', async () => {
      llmService.sendChatMessageStream.mockImplementation((message, context, onChunk) => {
        onChunk('Response');
        return Promise.resolve();
      });

      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      await userEvent.type(input, 'Test message{Enter}');

      await waitFor(() => {
        expect(llmService.sendChatMessageStream).toHaveBeenCalled();
      });
    });

    test('input field has proper type attribute', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      expect(input).toHaveAttribute('type', 'text');
    });

    test('send button has proper type attribute', () => {
      render(<ChatInterface videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const button = screen.getByRole('button', { name: 'Send' });
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  // ========== IMPERATIVE HANDLE TESTS ==========

  describe('Imperative Handle - setQuestion', () => {
    test('setQuestion sets input value and focuses input', () => {
      const ref = { current: null };
      render(<ChatInterface ref={ref} videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const focusSpy = jest.spyOn(input, 'focus');

      // Call setQuestion via ref
      ref.current.setQuestion('What is this video about?', true);

      expect(input).toHaveValue('What is this video about?');
      expect(focusSpy).toHaveBeenCalled();
    });

    test('setQuestion sets input value without focusing when autoFocus is false', () => {
      const ref = { current: null };
      render(<ChatInterface ref={ref} videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const focusSpy = jest.spyOn(input, 'focus');

      // Call setQuestion with autoFocus=false
      ref.current.setQuestion('Another question', false);

      expect(input).toHaveValue('Another question');
      expect(focusSpy).not.toHaveBeenCalled();
    });

    test('setQuestion defaults autoFocus to true', () => {
      const ref = { current: null };
      render(<ChatInterface ref={ref} videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const focusSpy = jest.spyOn(input, 'focus');

      // Call setQuestion without second parameter
      ref.current.setQuestion('Default focus test');

      expect(input).toHaveValue('Default focus test');
      expect(focusSpy).toHaveBeenCalled();
    });

    test('setQuestion calls scrollIntoView on input when autoFocus is true', () => {
      const ref = { current: null };
      render(<ChatInterface ref={ref} videoId={mockVideoId} videoTitle={mockVideoTitle} />);

      const input = screen.getByPlaceholderText('Type your question...');
      const scrollSpy = jest.spyOn(input, 'scrollIntoView');

      ref.current.setQuestion('Scroll test', true);

      expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });
  });
});
