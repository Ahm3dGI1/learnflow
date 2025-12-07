/**
 * Tests for PlaybackSpeedControl Component
 *
 * Verifies that the playback speed control correctly manages
 * speed selection, persistence, and integration with video player.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PlaybackSpeedControl, { PLAYBACK_SPEEDS, STORAGE_KEY, DEFAULT_SPEED } from './PlaybackSpeedControl';

describe('PlaybackSpeedControl', () => {
  let mockVideoRef;
  let localStorageMock;

  beforeEach(() => {
    // Create mock video ref
    mockVideoRef = {
      current: {
        setPlaybackRate: jest.fn(),
        getPlaybackRate: jest.fn(() => 1),
      },
    };

    // Mock localStorage
    localStorageMock = {
      store: {},
      getItem: jest.fn((key) => localStorageMock.store[key] || null),
      setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
      }),
      clear: jest.fn(() => {
        localStorageMock.store = {};
      }),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('rendering', () => {
    it('renders speed button with default speed', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button', { name: /playback speed/i });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
    });

    it('renders with play icon', () => {
      const { container } = render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const icon = container.querySelector('.speed-icon');
      expect(icon).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <PlaybackSpeedControl videoRef={mockVideoRef} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('dropdown interaction', () => {
    it('opens dropdown when button is clicked', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const dropdown = screen.getByRole('listbox');
      expect(dropdown).toBeInTheDocument();
    });

    it('closes dropdown when speed is selected', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      // Open dropdown
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Select a speed
      const option = screen.getByText('1.5x');
      fireEvent.click(option);

      // Dropdown should be closed
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('displays all available speed options', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));

      PLAYBACK_SPEEDS.forEach((speed) => {
        expect(screen.getByText(speed.label)).toBeInTheDocument();
      });
    });

    it('highlights currently selected speed', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));

      const selectedOption = screen.getByRole('option', { selected: true });
      expect(selectedOption).toHaveClass('selected');
      expect(selectedOption).toHaveTextContent('1x (Normal)');
    });
  });

  describe('speed change', () => {
    it('updates display when speed is changed', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      // Open and select 1.5x
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('1.5x'));

      // Button should now show 1.5x
      expect(screen.getByText('1.5x')).toBeInTheDocument();
    });

    it('calls setPlaybackRate on video player', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('2x'));

      expect(mockVideoRef.current.setPlaybackRate).toHaveBeenCalledWith(2);
    });

    it('calls onSpeedChange callback when provided', () => {
      const onSpeedChange = jest.fn();
      render(
        <PlaybackSpeedControl videoRef={mockVideoRef} onSpeedChange={onSpeedChange} />
      );

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('0.75x'));

      expect(onSpeedChange).toHaveBeenCalledWith(0.75);
    });
  });

  describe('localStorage persistence', () => {
    it('saves speed preference to localStorage', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByText('1.25x'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(STORAGE_KEY, '1.25');
    });

    it('loads saved speed preference on mount', () => {
      localStorageMock.store[STORAGE_KEY] = '1.5';

      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      expect(screen.getByText('1.5x')).toBeInTheDocument();
    });

    it('ignores invalid saved speed', () => {
      localStorageMock.store[STORAGE_KEY] = '999';

      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      expect(screen.getByText('1x')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('opens dropdown with Enter key', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown with Space key', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: ' ' });

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown with Escape key', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('selects option with Enter key', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));
      
      const option = screen.getByText('1.75x');
      fireEvent.keyDown(option, { key: 'Enter' });

      expect(mockVideoRef.current.setPlaybackRate).toHaveBeenCalledWith(1.75);
    });
  });

  describe('accessibility', () => {
    it('has proper ARIA attributes on button', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('updates aria-expanded when dropdown opens', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('dropdown has accessible label', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));

      const dropdown = screen.getByRole('listbox');
      expect(dropdown).toHaveAttribute('aria-label', 'Playback speed options');
    });

    it('options have correct role and aria-selected', () => {
      render(<PlaybackSpeedControl videoRef={mockVideoRef} />);

      fireEvent.click(screen.getByRole('button'));

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(PLAYBACK_SPEEDS.length);

      const selectedOption = options.find(
        (opt) => opt.getAttribute('aria-selected') === 'true'
      );
      expect(selectedOption).toBeInTheDocument();
    });
  });

  describe('constants', () => {
    it('exports PLAYBACK_SPEEDS array', () => {
      expect(Array.isArray(PLAYBACK_SPEEDS)).toBe(true);
      expect(PLAYBACK_SPEEDS.length).toBeGreaterThan(0);
    });

    it('exports STORAGE_KEY string', () => {
      expect(typeof STORAGE_KEY).toBe('string');
      expect(STORAGE_KEY).toContain('playback');
    });

    it('exports DEFAULT_SPEED as 1', () => {
      expect(DEFAULT_SPEED).toBe(1);
    });

    it('all speeds have value and label properties', () => {
      PLAYBACK_SPEEDS.forEach((speed) => {
        expect(speed).toHaveProperty('value');
        expect(speed).toHaveProperty('label');
        expect(typeof speed.value).toBe('number');
        expect(typeof speed.label).toBe('string');
      });
    });
  });
});

