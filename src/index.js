import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import Photography from './Photography';

const ImprovingVLMs = lazy(() => import('./writing/improving-vlms/Article'));
const VisualComposition = lazy(() => import('./writing/visual-composition/Article'));

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/photography" element={<Photography />} />
        <Route path="/writing/improving-vlms" element={<Suspense fallback={<main className="content-column" aria-busy="true">Loading article...</main>}><ImprovingVLMs /></Suspense>} />
        <Route path="/writing/visual-composition" element={<Suspense fallback={<main className="content-column" aria-busy="true">Loading article...</main>}><VisualComposition /></Suspense>} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
