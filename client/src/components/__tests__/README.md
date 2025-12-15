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
- **CheckpointPopup.test.js** - MCQ component with state
- **InputBar.test.js** - Simple input component
- **VideoHistoryCard.test.js** - Card with interactions
- **QuizResults.test.js** - Conditional rendering
