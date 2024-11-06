import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Access the 'app' element instead of 'root'
const rootElement = document.getElementById('app'); // Make sure 'app' is in your HTML
if (!rootElement) throw new Error('Failed to find the root element');

// Create the root and render the app
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
