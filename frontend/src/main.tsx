import '@ant-design/v5-patch-for-react-19';
// ============================================================
// NEXUS-AID — Application Entry Point
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './config/i18n';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
