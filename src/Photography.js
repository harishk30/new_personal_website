import React from 'react';
import { Link } from 'react-router-dom';
import './App.css';

// Astrophotography images
import crescentImg from './assets/crescent.png';
import baImg from './assets/ba.png';
import caliImg from './assets/cali.png';
import sadrImg from './assets/sadr.png';
import veilImg from './assets/veil.png';
import redImg from './assets/red.png';
import mwImg from './assets/mw.png';
import pelicanImg from './assets/pelican.png';
import m81Img from './assets/m81.png';

// Astrophotography data
const astrophotos = [
  { id: 1, src: crescentImg, title: "Crescent Nebula", description: "NGC 6888, a cosmic bubble blown by stellar winds" },
  { id: 2, src: baImg, title: "North America Nebula", description: "NGC 7000, resembling the continent in the night sky" },
  { id: 3, src: caliImg, title: "California Nebula", description: "NGC 1499, an emission nebula in Perseus" },
  { id: 4, src: sadrImg, title: "Sadr Region", description: "The heart of Cygnus, rich with nebulosity" },
  { id: 5, src: veilImg, title: "Veil Nebula", description: "A supernova remnant in Cygnus" },
  { id: 6, src: redImg, title: "IC 5068", description: "Part of the Cygnus Wall complex" },
  { id: 7, src: mwImg, title: "The Milky Way", description: "Our home galaxy arching across the sky in Maui, Hawaii" },
  { id: 8, src: pelicanImg, title: "Pelican Nebula", description: "IC 5070, neighbor to the North America Nebula" },
  { id: 9, src: m81Img, title: "M81, M82 and IFN", description: "Bode's Galaxy, Cigar Galaxy, and Integrated Flux Nebulae" }
];

function Photography() {
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <Link to="/" className="site-title-link">
          <h1 className="site-title">Harish Krishnakumar</h1>
        </Link>
        <nav className="nav">
          <Link to="/#about" className="nav-link">About</Link>
          <Link to="/#research" className="nav-link">Research</Link>
          <Link to="/#blogs" className="nav-link">Blogs</Link>
          <a href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing" className="nav-link" target="_blank" rel="noopener noreferrer">Resume</a>
          <Link to="/photography" className="nav-link nav-link-active">Photography</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main photography-page">
        <section className="photography-section" id="photography">
          <div className="photography-header">
            <h2 className="section-title">Harish Krishnakumar Astrophotography</h2>
            <a 
              href="https://www.instagram.com/hk.astro/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="instagram-link"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
          </div>
          <p className="photography-intro">
            Hi! My name is Harish, and I'm an award-winning astrophotographer from Seattle, Washington. 
            My work has previously been recognized by NASA, the SETI Institute, and several major telescope companies. 
            Here's a selection of a few of my pieces capturing the night sky:
          </p>
          <div className="photo-gallery">
            {astrophotos.map(photo => (
              <div key={photo.id} className="photo-card">
                <div className="photo-image-container">
                  <img src={photo.src} alt={photo.title} className="photo-image" />
                </div>
                <div className="photo-info">
                  <h3 className="photo-title">{photo.title}</h3>
                  <p className="photo-description">{photo.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Photography;

