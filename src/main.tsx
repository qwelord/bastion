import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppBoundary } from './components/AppBoundary';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/literata/cyrillic-400.css';
import '@fontsource/literata/latin-400.css';
import './styles.css';
import './learning-refresh.css';
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppBoundary>
      <App />
    </AppBoundary>
  </React.StrictMode>,
);
