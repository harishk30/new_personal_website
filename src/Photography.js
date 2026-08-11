import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import ThemeToggle, { useTheme } from './ThemeToggle';

import crescentImg from './assets/crescent.png';
import baImg from './assets/ba.png';
import caliImg from './assets/cali.png';
import sadrImg from './assets/sadr.png';
import veilImg from './assets/veil.png';
import redImg from './assets/red.png';
import mwImg from './assets/mw.png';
import pelicanImg from './assets/pelican.png';
import m81Img from './assets/m81.png';

const astrophotos = [
  [crescentImg, 'Crescent Nebula', 'NGC 6888 · Cygnus'],
  [baImg, 'North America Nebula', 'NGC 7000 · Cygnus'],
  [caliImg, 'California Nebula', 'NGC 1499 · Perseus'],
  [sadrImg, 'Sadr Region', 'Emission nebulae · Cygnus'],
  [veilImg, 'Veil Nebula', 'Supernova remnant · Cygnus'],
  [redImg, 'IC 5068', 'Cygnus Wall complex'],
  [mwImg, 'The Milky Way', 'Maui, Hawaiʻi'],
  [pelicanImg, 'Pelican Nebula', 'IC 5070 · Cygnus'],
  [m81Img, 'M81, M82 and IFN', 'Ursa Major'],
];

function Photography() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="gallery-page">
      <header className="page-topbar gallery-topbar">
        <Link className="wordmark" to="/" aria-label="Return home">
          Harish Krishnakumar
        </Link>
        <nav className="small-nav" aria-label="Photography navigation">
          <Link to="/">Research</Link>
          <a href="https://www.instagram.com/hk.astro/" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </nav>
      </header>

      <main className="gallery-main">
        <div className="gallery-intro">
          <p className="eyebrow">Astrophotography</p>
          <p className="gallery-description">
            A selection of my deep-sky images. My work has been recognized by NASA, the SETI
            Institute, and major telescope makers.
          </p>
        </div>

        <div className="photo-grid">
          {astrophotos.map(([src, title, detail]) => (
            <figure className="photo-figure" key={title}>
              <img src={src} alt={title} loading="lazy" />
              <figcaption>
                <span>{title}</span>
                <small>{detail}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </main>
    </div>
  );
}

export default Photography;
