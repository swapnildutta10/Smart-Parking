import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/app.css';
import App from './app/App';
import './styles/site-modern.css';
import './styles/dark-theme.css';
import './styles/motorsport-theme.css';
import './styles/light-theme.css';
import './styles/theme-contrast.css';
import './styles/site-rhythm.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
