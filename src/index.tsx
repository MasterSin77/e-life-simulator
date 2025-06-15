/**
 * index.tsx
 * 
 * This is the true entry point for your e-Life React app.
 * It finds the <div id="root"></div> in public/index.html
 * and tells React to render your <App /> there.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import your global styles

// This creates the React root (React 18 style)
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// This actually renders your whole App tree inside <div id="root">
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
