/**
 * Tests for FlashcardDeck Component
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FlashcardDeck from '../FlashcardDeck';

// Mock Lucide icons to avoid weird SVG issues in tests
jest.mock('lucide-react', () => ({
    ChevronLeft: () => <span data-testid="icon-prev" />,
    ChevronRight: () => <span data-testid="icon-next" />,
    RotateCcw: () => <span data-testid="icon-reset" />,
    Target: () => <span data-testid="icon-target" />,
    Trophy: () => <span data-testid="icon-trophy" />,
    Clock: () => <span data-testid="icon-clock" />,
    Brain: () => <span data-testid="icon-brain" />,
    CheckCircle: () => <span data-testid="icon-check" />,
    XCircle: () => <span data-testid="icon-x" />,
}));

const mockFlashcards = [
    { id: '1', question: 'Q1', answer: 'A1', difficulty: 'easy' },
    { id: '2', question: 'Q2', answer: 'A2', difficulty: 'medium' },
    { id: '3', question: 'Q3', answer: 'A3', difficulty: 'hard' },
];

describe('FlashcardDeck', () => {
    test('renders deck with first card', () => {
        render(<FlashcardDeck flashcards={mockFlashcards} />);
        expect(screen.getByText('Q1')).toBeInTheDocument();
        expect(screen.getByText('Card 1 / 3')).toBeInTheDocument();
    });

    test('navigates to next card on button click', () => {
        render(<FlashcardDeck flashcards={mockFlashcards} />);

        const nextBtn = screen.getByRole('button', { name: /next/i });
        fireEvent.click(nextBtn);

        expect(screen.getByText('Q2')).toBeInTheDocument();
        expect(screen.getByText('Card 2 / 3')).toBeInTheDocument();
    });

    test('navigates to previous card on button click', () => {
        render(<FlashcardDeck flashcards={mockFlashcards} />);

        // Go to second card
        fireEvent.click(screen.getByRole('button', { name: /next/i }));
        expect(screen.getByText('Q2')).toBeInTheDocument();

        // Go back
        fireEvent.click(screen.getByRole('button', { name: /previous/i }));
        expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    test('spacebar flips the card', () => {
        render(<FlashcardDeck flashcards={mockFlashcards} />);

        // Initial state: Question visible, Answer hidden (conceptually)
        // In DOM, both might be present but flipped via CSS. 
        // We check if the 'flipped' class is applied to the flashcard container.

        const flashcard = screen.getByTestId('flashcard');
        expect(flashcard).not.toHaveClass('flipped');

        // Press Space
        fireEvent.keyDown(window, { code: 'Space' });

        expect(flashcard).toHaveClass('flipped');

        // Press Space again
        fireEvent.keyDown(window, { code: 'Space' });
        expect(flashcard).not.toHaveClass('flipped');
    });

    test('arrow keys navigate', () => {
        render(<FlashcardDeck flashcards={mockFlashcards} />);

        // Right Arrow -> Next
        fireEvent.keyDown(window, { code: 'ArrowRight' });
        expect(screen.getByText('Q2')).toBeInTheDocument();

        // Left Arrow -> Prev
        fireEvent.keyDown(window, { code: 'ArrowLeft' });
        expect(screen.getByText('Q1')).toBeInTheDocument();
    });

    test('number keys rate card when flipped', () => {
        const onProgress = jest.fn();
        render(<FlashcardDeck flashcards={mockFlashcards} onProgress={onProgress} />);

        // Must flip first
        fireEvent.keyDown(window, { code: 'Space' });

        // Press '1' (Incorrect)
        fireEvent.keyDown(window, { code: 'Digit1' });

        expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({
            isCorrect: false,
            cardId: '1'
        }));
    });
});
