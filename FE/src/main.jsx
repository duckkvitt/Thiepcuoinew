import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
const appModule = window.location.pathname.startsWith('/admin')
  ? import('./AdminApp.jsx')
  : import('./App.jsx');

Promise.resolve(appModule).then(({ default: RootApp }) => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>{createElement(RootApp)}</StrictMode>
  );
});
