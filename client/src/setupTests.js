/**
 * Jest Test Configuration for LearnFlow
 * 
 * Configures Jest testing environment by importing custom DOM matchers from
 * @testing-library/jest-dom. This provides additional assertion methods for
 * testing React components and DOM elements in a more readable way.
 * 
 * Custom matchers added:
 * - toBeInTheDocument(): Element is present in DOM
 * - toHaveTextContent(text): Element contains specific text
 * - toHaveClass(className): Element has CSS class
 * - toBeVisible(): Element is visible to user
 * - toBeDisabled(): Form element is disabled
 * - And many more...
 * 
 * This file is automatically loaded before each test suite runs.
 * 
 * @module setupTests
 * @see {@link https://github.com/testing-library/jest-dom|jest-dom documentation}
 * 
 * @example
 * // In a test file
 * import { render, screen } from '@testing-library/react';
 * import Login from './Login';
 * 
 * test('displays login form', () => {
 *   render(<Login />);
 *   expect(screen.getByRole('button')).toHaveTextContent(/log in/i);
 * });
 */

import '@testing-library/jest-dom';
