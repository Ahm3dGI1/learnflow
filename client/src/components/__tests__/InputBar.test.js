/**
 * Unit tests for InputBar component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import InputBar from '../InputBar';

describe('InputBar', () => {
  const mockSetVideoUrl = jest.fn();
  const mockOnSend = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== RENDERING TESTS ==========

  test('renders input field with placeholder', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toBeInTheDocument();
  });

  test('renders submit button', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const button = screen.getByRole('button', { name: /load video/i });
    expect(button).toBeInTheDocument();
  });

  test('displays current videoUrl value', () => {
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    render(
      <InputBar
        videoUrl={testUrl}
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toHaveValue(testUrl);
  });

  test('input has autocomplete disabled', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toHaveAttribute('autoComplete', 'off');
  });

  // ========== INTERACTION TESTS ==========

  test('calls setVideoUrl when text is entered', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=abc123' } });

    expect(mockSetVideoUrl).toHaveBeenCalledTimes(1);
    expect(mockSetVideoUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=abc123');
  });

  test('calls onSend when submit button is clicked', () => {
    render(
      <InputBar
        videoUrl="https://youtube.com/watch?v=abc123"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const button = screen.getByRole('button', { name: /load video/i });
    fireEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  test('calls onSend when Enter key is pressed', () => {
    render(
      <InputBar
        videoUrl="https://youtube.com/watch?v=abc123"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  test('does not call onSend for other keys', () => {
    render(
      <InputBar
        videoUrl="https://youtube.com/watch?v=abc123"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    fireEvent.keyPress(input, { key: 'a', code: 'KeyA' });
    fireEvent.keyPress(input, { key: 'Space', code: 'Space' });
    fireEvent.keyPress(input, { key: 'Tab', code: 'Tab' });

    expect(mockOnSend).not.toHaveBeenCalled();
  });

  test('allows clicking submit button with empty input', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const button = screen.getByRole('button', { name: /load video/i });
    fireEvent.click(button);

    // Button should still call onSend (validation happens elsewhere)
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  test('allows Enter key with empty input', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // Should still call onSend (validation happens elsewhere)
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  // ========== INPUT HANDLING TESTS ==========

  test('handles multiple character inputs', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');

    fireEvent.change(input, { target: { value: 'h' } });
    fireEvent.change(input, { target: { value: 'ht' } });
    fireEvent.change(input, { target: { value: 'htt' } });

    expect(mockSetVideoUrl).toHaveBeenCalledTimes(3);
  });

  test('handles pasted content', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    const pastedUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    fireEvent.change(input, { target: { value: pastedUrl } });

    expect(mockSetVideoUrl).toHaveBeenCalledWith(pastedUrl);
  });

  test('handles URL clearing', () => {
    render(
      <InputBar
        videoUrl="https://youtube.com/watch?v=abc123"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockSetVideoUrl).toHaveBeenCalledWith('');
  });

  test('handles special characters in URL', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    const urlWithSpecialChars = 'https://youtube.com/watch?v=abc&t=123&list=xyz';

    fireEvent.change(input, { target: { value: urlWithSpecialChars } });

    expect(mockSetVideoUrl).toHaveBeenCalledWith(urlWithSpecialChars);
  });

  test('handles very long URLs', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    const longUrl = 'https://www.youtube.com/watch?v=abc123&' + 'param=value&'.repeat(50);

    fireEvent.change(input, { target: { value: longUrl } });

    expect(mockSetVideoUrl).toHaveBeenCalledWith(longUrl);
  });

  // ========== COMPONENT STATE TESTS ==========

  test('updates displayed value when videoUrl prop changes', () => {
    const { rerender } = render(
      <InputBar
        videoUrl="https://youtube.com/watch?v=first"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    let input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toHaveValue('https://youtube.com/watch?v=first');

    rerender(
      <InputBar
        videoUrl="https://youtube.com/watch?v=second"
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toHaveValue('https://youtube.com/watch?v=second');
  });

  test('maintains focus after typing', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    input.focus();

    fireEvent.change(input, { target: { value: 'test' } });

    expect(document.activeElement).toBe(input);
  });

  // ========== ACCESSIBILITY TESTS ==========

  test('input is a text field', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    expect(input).toHaveAttribute('type', 'text');
  });

  test('button is keyboard accessible', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const button = screen.getByRole('button', { name: /load video/i });
    expect(button).not.toHaveAttribute('tabindex', '-1');
  });

  // ========== INTEGRATION TESTS ==========

  test('complete workflow: type URL and submit', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');
    const button = screen.getByRole('button', { name: /load video/i });

    // Type URL
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=test' } });
    expect(mockSetVideoUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=test');

    // Submit
    fireEvent.click(button);
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });

  test('complete workflow: paste URL and press Enter', () => {
    render(
      <InputBar
        videoUrl=""
        setVideoUrl={mockSetVideoUrl}
        onSend={mockOnSend}
      />
    );

    const input = screen.getByPlaceholderText('Paste your YouTube link here...');

    // Paste URL
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=paste' } });
    expect(mockSetVideoUrl).toHaveBeenCalledWith('https://youtube.com/watch?v=paste');

    // Press Enter
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(mockOnSend).toHaveBeenCalledTimes(1);
  });
});
