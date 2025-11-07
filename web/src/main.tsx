import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';

// Initialize loading progress
const updateProgress = (progress: number) => {
  const progressBar = document.getElementById('progress') as HTMLElement;
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
};

// Show loading progress
updateProgress(10);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);