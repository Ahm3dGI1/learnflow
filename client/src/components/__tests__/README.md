# Testing Guide

## Running Tests

```bash
# Run all tests
cd client
npm test

# Run specific test file
npm test CheckpointPopup.test.js

# Run in watch mode (auto-rerun on changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Filter by test name
npm test -- --testNamePattern="renders title"
```

## Adding New Tests

### 1. Create Test File
Place test next to component in `__tests__/` folder:
```
components/
  MyComponent.jsx
  __tests__/
    MyComponent.test.js  ← Create here
```

### 2. Basic Template
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  const mockProps = { title: 'Test', onClick: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders title', () => {
    render(<MyComponent {...mockProps} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    render(<MyComponent {...mockProps} />);
    fireEvent.click(screen.getByText('Test'));
    expect(mockProps.onClick).toHaveBeenCalledTimes(1);
  });
});
```

### 3. Common Queries
```javascript
screen.getByRole('button', { name: /submit/i })  // Best - accessible
screen.getByText('Submit')                        // Good - visible text
screen.getByPlaceholderText('Email...')          // Good - for inputs
screen.getByLabelText('Email Address')           // Good - for forms
screen.getByAltText('Logo')                      // Good - for images
```

### 4. Common Assertions
```javascript
expect(element).toBeInTheDocument()
expect(element).toHaveClass('active')
expect(element).toHaveAttribute('aria-label', 'Submit')
expect(input).toHaveValue('text')
expect(button).toBeDisabled()
expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
```

## Examples

See existing test files for reference:
- **CheckpointPopup.test.js** - MCQ component with state (493 lines, 50+ tests)
- **CheckpointProgressBar.test.js** - Timeline component with backend data (44 tests) ✨ NEW
- **ChatInterface.test.js** - Chat UI with real-time streaming (40 tests) ✨ NEW
- **InputBar.test.js** - Simple input component
- **Quiz.test.js** - Multi-question quiz component
- **QuizResults.test.js** - Conditional rendering
- **VideoHistoryCard.test.js** - Card with interactions

### Test Coverage Summary

| Component | Tests | Coverage Areas |
|-----------|-------|----------------|
| ChatInterface | 40 | Rendering, history loading, transcript handling, message submission, streaming, error handling, accessibility |
| CheckpointProgressBar | 44 | Rendering, positioning, completion status, click/keyboard interactions, time formatting, progress summary |
| CheckpointPopup | 50+ | MCQ format, answer selection, feedback, keyboard navigation |
| Quiz | 30+ | Question display, answer tracking, submission, validation |
| QuizResults | 10+ | Score display, pass/fail states, retry functionality |
| InputBar | 10+ | Text input, submission, validation |
| VideoHistoryCard | 10+ | Card display, click handling, metadata |

**Total: 200+ comprehensive tests**

