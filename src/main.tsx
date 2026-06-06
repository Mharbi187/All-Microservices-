import '@ant-design/v5-patch-for-react-19';
// ============================================================
// NEXUS-AID — Application Entry Point
// ============================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './config/i18n';

// Patch HTMLCanvasElement to suppress willReadFrequently warning from third-party libraries like leaflet_heat
const originalGetContext = HTMLCanvasElement.prototype.getContext;
(HTMLCanvasElement.prototype as any).getContext = function(contextType: string, contextAttributes?: any) {
    if (contextType === '2d' || contextType === 'experimental-webgl' || contextType === 'webgl' || contextType === 'webgl2') {
        contextAttributes = contextAttributes || {};
        if (contextType === '2d') {
            contextAttributes.willReadFrequently = true;
        }
    }
    return (originalGetContext as any).call(this, contextType, contextAttributes);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
