import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App.tsx'

// Accessibility testing in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}

createRoot(document.getElementById('root')!).render(
  // Temporarily disable StrictMode to avoid double OpenAI initialization
  // In production, we'd handle this better with proper cleanup
  <App />
)
