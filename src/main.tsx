import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof document !== 'undefined') {
  const doc = document as Document & { fonts?: FontFaceSet };
  if (doc.fonts?.load) {
    doc.fonts.load('24px "Material Symbols Outlined"').then(() => {
      doc.documentElement.classList.add('mat-icons-ready');
    }).catch(() => {
      // Keep icons hidden on load failure to avoid ligature text flash.
    });
  } else {
    doc.documentElement.classList.add('mat-icons-ready');
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
