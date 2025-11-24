/**
 * React Application Entry Point
 * 
 * Bootstraps the LearnFlow React application by mounting the root App component
 * to the DOM. Enables React Strict Mode for development warnings and integrates
 * performance monitoring via reportWebVitals.
 * 
 * Strict Mode activates additional checks and warnings for:
 * - Identifying unsafe lifecycles
 * - Warning about legacy string ref API usage
 * - Detecting unexpected side effects
 * - Ensuring reusable state
 * 
 * @module index
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Create root React element and mount to DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring - reports web vitals metrics
// Pass a function to log results (e.g., reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
