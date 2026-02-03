import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import headshotImage from './assets/harish_headshot.jpg';

// Research preview images
import xSagaPreview from './assets/xSagaPreview.png';
import ringPreview from './assets/ring_preview.png';
import gnnPreview from './assets/gnn_preview.jpg';

// Blog thumbnail images
import sidekickThumb from './assets/sidekick_thumb.jpg';

// Research data
const researchData = [
  {
    id: 1,
    title: "Extending the SAGA Survey (xSAGA). II. Satellite Properties of Low-Redshift Milky Way and Local Group Analogs",
    authors: [
      { name: "Harish Krishnakumar", isMe: true },
      { name: "John Wu", url: "https://jwuphysics.github.io/" }
    ],
    description: "Studied dwarf satellite galaxies in xSAGA data, and analyzed how host environment affects their formation, making broader conclusions about the formation and evolution of galaxies like the Milky Way.",
    tags: ["Astrophysics"],
    badges: ["Poster at AAS 245"],
    preview: xSagaPreview,
    links: [
      { label: "Abstract", url: "https://ui.adsabs.harvard.edu/abs/2025AAS...24515812K/abstract" },
      { label: "GitHub", url: "https://github.com/harishk30/DwarfGalaxyAnalysis" }
    ]
  },
  {
    id: 2,
    title: "Analysis of Ring Galaxies Detected Using Deep Learning with Real and Simulated Data",
    authors: [
      { name: "Harish Krishnakumar", isMe: true },
      { name: "J. Bryce Kalmbach", url: "https://jbkalmbach.github.io/" }
    ],
    description: "Discovered ~2000 previously unclassified ring galaxies with a machine learning model I created. The model was trained on both synthetic and real data.",
    tags: ["Astrophysics", "Vision"],
    badges: ["Astronomical Journal", "Poster at AAS 240 + 241"],
    preview: ringPreview,
    links: [
      { label: "Paper", url: "https://arxiv.org/abs/2210.11428" },
      { label: "GitHub", url: "https://github.com/harishk30/RingGalaxiesCNNAnalysis" }
    ]
  },
  {
    id: 3,
    title: "Using GNNs to Predict Cosmological Parameters from Heterogeneous Graphs of Galaxies",
    authors: [],
    description: "Applied Graph Neural Networks (GNNs) to predict cosmological parameters from graphs of galaxies. I was advised by Francisco Villaescusa-Navarro at the Center for Computational Astrophysics.",
    descriptionLink: { name: "Francisco Villaescusa-Navarro", url: "https://franciscovillaescusa.github.io/" },
    tags: ["Astrophysics"],
    badges: [],
    preview: gnnPreview,
    links: [
      { label: "GitHub", url: "https://github.com/harishk30/CamelsHeteroGNN" }
    ]
  }
];

const allTags = ["Reinforcement Learning", "Vision", "Astrophysics"];

// Blog data
const blogsData = [
  {
    id: 1,
    title: "Sidekick: From Passive to Proactive Assistants",
    summary: "Exploring proactive assistants beyond prompts and chat. What changes when systems help at the right moment, without being asked?",
    thumbnail: sidekickThumb,
    links: [
      { label: "Post", url: "https://open.substack.com/pub/harishkk/p/sidekick-from-passive-to-proactive?r=75hdfc&utm_campaign=post&utm_medium=web" },
      { label: "GitHub", url: "https://github.com/harishk30/Sidekick" }
    ]
  }
];

// Footnotes data
const footnotes = {
  1: {
    content: (
      <div className="footnote-courses">
        <p className="footnote-intro">Some interesting courses I've taken at Princeton include —</p>
        <p className="footnote-note">* denotes a graduate course, <span className="in-progress">blue</span> denotes in progress</p>

        <p className="footnote-category">Computer Science:</p>
        <ul>
          <li>COS 418 | Distributed Systems</li>
          <li className="in-progress">COS 423 | Theory of Algorithms</li>
          <li>ECE 435 | Machine Learning and Pattern Recognition</li>
          <li className="in-progress">ECE 476 | Parallel Computing</li>
          <li>ECE 524* | Foundations of Reinforcement Learning</li>
          <li>COS 598A* | AI Safety & Alignment</li>
        </ul>

        <p className="footnote-category">Physics:</p>
        <ul>
          <li>PHY 105 | Advanced Mechanics</li>
          <li>PHY 207 | From Classical to Quantum Mechanics</li>
          <li>PHY 208 | Quantum Mechanics</li>
          <li className="in-progress">AST/PHY 401 | Cosmology</li>
        </ul>

        <p className="footnote-category">Misc:</p>
        <ul>
          <li className="in-progress">COS/SPI 351 | Tech Policy and Law</li>
          <li>ORF 309 | Probability and Stochastic Systems</li>
          <li>SAN 101 | Introductory Sanskrit</li>
          <li>ITA 303 | Dante's Inferno</li>
          <li>CWR 204 | Creative Writing - Fiction</li>
        </ul>
      </div>
    ),
    position: 'below'
  },
  2: {
    content: (
      <>
        I strongly believe multimodal capabilities are intertwined with creating intelligent and useful agents. This{' '}
        <a href="https://x.com/astro_nolan/status/1965600058642211075" target="_blank" rel="noopener noreferrer" className="footnote-link">
          tweet
        </a>
        {' '}pretty succinctly captures my thoughts!
      </>
    ),
    position: 'above'
  }
};

function App() {
  const [selectedTags, setSelectedTags] = useState([]);
  const [activeFootnote, setActiveFootnote] = useState(null);
  const [clickedFootnote, setClickedFootnote] = useState(null);
  const [showCloseHint, setShowCloseHint] = useState(false);
  const [scrollIndicator, setScrollIndicator] = useState({});
  const [modalFootnote, setModalFootnote] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleFootnoteClick = (num) => {
    if (isMobile) {
      setModalFootnote(num);
    } else {
      if (clickedFootnote === num) {
        setClickedFootnote(null);
      } else {
        setClickedFootnote(num);
        setShowCloseHint(true);
        setTimeout(() => setShowCloseHint(false), 1500);
      }
    }
  };

  const closeModal = () => {
    setModalFootnote(null);
  };

  const handleFootnoteHover = (num) => {
    if (!isMobile && clickedFootnote === null) {
      setActiveFootnote(num);
    }
  };

  const handleFootnoteLeave = () => {
    if (!isMobile && clickedFootnote === null) {
      setActiveFootnote(null);
    }
  };

  const handleScroll = (e, num) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;
    setScrollIndicator(prev => ({ ...prev, [num]: !isAtBottom }));
  };

  const isFootnoteVisible = (num) => !isMobile && (activeFootnote === num || clickedFootnote === num);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const isCardVisible = (cardTags) => {
    if (selectedTags.length === 0) return true;
    return cardTags.some(tag => selectedTags.includes(tag));
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <h1 className="site-title">Harish Krishnakumar</h1>
        <nav className="nav">
          <a href="#about" className="nav-link">About</a>
          <a href="#research" className="nav-link">Research</a>
          <a href="#blogs" className="nav-link">Blogs</a>
          <a href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing" className="nav-link" target="_blank" rel="noopener noreferrer">Resume</a>
          <Link to="/photography" className="nav-link">Photography</Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* About Section */}
        <section className="about-card" id="about">
          <div className="about-content">
            <div className="about-text">
              <h2 className="about-name">Harish Krishnakumar</h2>
              <a href="mailto:hkrishnakumar@princeton.edu" className="about-email">hkrishnakumar [at] princeton.edu</a>

              <div className="social-links">
                <a href="https://www.linkedin.com/in/harish-krishnakumar-aa240b196/" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="LinkedIn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a href="https://x.com/harishkrik" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Twitter">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://github.com/harishk30" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="GitHub">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a href="https://scholar.google.com/citations?user=wNnR_PAAAAAJ&hl=en&authuser=1" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Google Scholar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
                  </svg>
                </a>
              </div>

              <p className="about-intro">
                Hello! I'm Harish, a junior at Princeton studying Computer Science and Physics
                <span
                  className={`footnote-marker ${clickedFootnote === 1 ? 'active' : ''}`}
                  onClick={() => handleFootnoteClick(1)}
                  onMouseEnter={() => handleFootnoteHover(1)}
                  onMouseLeave={handleFootnoteLeave}
                >
                  1
                  {isFootnoteVisible(1) && (
                    <span
                      className={`footnote-tooltip footnote-tooltip-large footnote-tooltip-below ${scrollIndicator[1] !== false ? 'has-more' : ''}`}
                      onScroll={(e) => handleScroll(e, 1)}
                    >
                      {showCloseHint && clickedFootnote === 1 && (
                        <span className="close-hint">click again to close</span>
                      )}
                      {footnotes[1].content}
                    </span>
                  )}
                </span>.
              </p>

              <p className="about-paragraph">
                I work on <strong>reinforcement learning</strong> for <strong>long-horizon decision making</strong>.
                I believe agents that can reliably make decisions over long time scales will dramatically
                accelerate how we work, code, and do science.
              </p>

              <p className="about-paragraph">
                My current research centers on training tool-using reinforcement learning agents for automated scientific research, along with occasional projects in computer vision
                <span
                  className={`footnote-marker ${clickedFootnote === 2 ? 'active' : ''}`}
                  onClick={() => handleFootnoteClick(2)}
                  onMouseEnter={() => handleFootnoteHover(2)}
                  onMouseLeave={handleFootnoteLeave}
                >
                  2
                  {isFootnoteVisible(2) && (
                    <span className="footnote-tooltip">
                      {showCloseHint && clickedFootnote === 2 && (
                        <span className="close-hint">click again to close</span>
                      )}
                      {footnotes[2].content}
                    </span>
                  )}
                </span>
                . I'm primarily advised by professor{' '}
                <a href="https://liuzhuang13.github.io/" className="text-link" target="_blank" rel="noopener noreferrer">Zhuang Liu</a>.
              </p>

              <p className="about-paragraph">
                Previously, I was a Machine Learning Engineer intern at{' '}
                <a href="https://amazon.jobs/content/en/teams/agi" className="text-link" target="_blank" rel="noopener noreferrer">Amazon AGI</a>, working on
                inference for <a href="https://aws.amazon.com/nova/models/" className="text-link" target="_blank" rel="noopener noreferrer">Amazon Nova Sonic</a> (speech-to-speech).
                I've also worked on research in astrophysics and cosmology, from understanding the Milky Way to discovering galaxies.
              </p>

              <p className="about-paragraph">
                Outside of work, I love taking photos of the stars, and am an award-winning{' '}
                <a href="#photography" className="text-link">astrophotographer</a>. I'm
                also an avid singer and music listener. I've been trained in Indian Classical singing, but
                currently love R&B. I also love to read, and always appreciate a good book rec!
              </p>

              <p className="about-paragraph">
                If any of this resonates with you, feel free to reach out. I'm always happy to chat!
              </p>
            </div>

            <div className="about-image-container">
              <img
                src={headshotImage}
                alt="Harish Krishnakumar"
                className="headshot"
              />
            </div>
          </div>
        </section>

        {/* Research Section */}
        <section className="research-section" id="research">
          <h2 className="section-title">Research</h2>

          <div className="tag-filters">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`tag-button ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {selectedTags.includes("Reinforcement Learning") && (
            <p className="coming-soon">Coming Soon!</p>
          )}

          <div className="research-grid">
            {researchData.map(research => (
              <div
                key={research.id}
                className={`research-card ${isCardVisible(research.tags) ? 'visible' : 'hidden'} ${!research.badges || research.badges.length === 0 ? 'no-badges' : ''}`}
              >
                {research.badges && research.badges.length > 0 && (
                  <div className="research-badges">
                    {research.badges.map(badge => (
                      <span key={badge} className="research-badge">{badge}</span>
                    ))}
                  </div>
                )}
                {research.preview && (
                  <div className="research-preview">
                    <img src={research.preview} alt={research.title} className="research-preview-img" />
                  </div>
                )}
                <div className="research-card-content">
                  <h3 className="research-title">{research.title}</h3>
                  {research.authors && research.authors.length > 0 && (
                    <p className="research-authors">
                      {research.authors.map((author, index) => (
                        <span key={author.name}>
                          {author.isMe ? (
                            <strong>{author.name}</strong>
                          ) : author.url ? (
                            <a
                              href={author.url}
                              className="text-link"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {author.name}
                            </a>
                          ) : (
                            <span>{author.name}</span>
                          )}
                          {index < research.authors.length - 1 && '; '}
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="research-description">
                    {research.descriptionLink ? (
                      <>
                        Applied Graph Neural Networks (GNNs) to predict cosmological parameters from graphs of galaxies. I was advised by{' '}
                        <a
                          href={research.descriptionLink.url}
                          className="text-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {research.descriptionLink.name}
                        </a>
                        {' '}at the Center for Computational Astrophysics.
                      </>
                    ) : (
                      research.description
                    )}
                  </p>
                  <div className="research-links">
                    {research.links && research.links.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        className="research-link-button"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                  <div className="research-tags">
                    {research.tags.map(tag => (
                      <span key={tag} className="research-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Blogs Section */}
        <section className="blogs-section" id="blogs">
          <h2 className="section-title">Blogs</h2>
          <div className="research-grid">
            {blogsData.map(blog => (
              <div key={blog.id} className="research-card no-badges visible">
                <div className="research-preview">
                  <img src={blog.thumbnail} alt={blog.title} className="research-preview-img" />
                </div>
                <div className="research-card-content">
                  <h3 className="research-title">{blog.title}</h3>
                  <p className="research-description">{blog.summary}</p>
                  <div className="research-links">
                    {blog.links.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        className="research-link-button"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footnote Modal for Mobile */}
      {modalFootnote && (
        <div className="footnote-modal-overlay" onClick={closeModal}>
          <div className="footnote-modal" onClick={(e) => e.stopPropagation()}>
            <button className="footnote-modal-close" onClick={closeModal}>×</button>
            <div className="footnote-modal-content">
              {footnotes[modalFootnote].content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

