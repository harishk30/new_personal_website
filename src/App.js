import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import NBodyBackground from './NBodyBackground';
import ThemeToggle, { useTheme } from './ThemeToggle';

const research = [
  {
    title: 'WorldBench: A Challenging and Visually Diverse Multimodal Reasoning Benchmark',
    authors: 'Yida Yin*, Harish Krishnakumar*',
    fullAuthors: 'Yida Yin*, Harish Krishnakumar*, Chung Peng Lee, Boya Zeng, Wenhao Chai, Shengbang Tong, Wenhu Chen, Hu Xu, Xingyu Fu, Gabriel Sarch, Aleksandra Korolova, Zhuang Liu',
    note: 'A benchmark designed to test multimodal models on visually diverse, real-world tasks that require both perception and reasoning; the strongest evaluated frontier model reached only 64% accuracy.',
    context: 'Preprint · Multimodal reasoning',
    links: [
      ['Paper', 'https://arxiv.org/abs/2606.06538'],
      ['Dataset', 'https://huggingface.co/datasets/zlab-princeton/WorldBench'],
      ['Code', 'https://github.com/zlab-princeton/WorldBench'],
      ['Website', 'https://worldbench-vl.github.io/'],
    ],
  },
  {
    title: 'Extending the SAGA Survey (xSAGA). II. Satellite Properties of Low-Redshift Milky Way and Local Group Analogs',
    authors: 'Harish Krishnakumar, John Wu',
    note: 'Measured dwarf satellite populations around Milky Way analogs to study how galaxy environment shapes their formation and evolution.',
    context: 'AAS 245 · Astrophysics',
    links: [
      ['Abstract', 'https://ui.adsabs.harvard.edu/abs/2025AAS...24515812K/abstract'],
      ['Code', 'https://github.com/harishk30/DwarfGalaxyAnalysis'],
    ],
  },
  {
    title: 'Analysis of Ring Galaxies Detected Using Deep Learning with Real and Simulated Data',
    authors: 'Harish Krishnakumar, J. Bryce Kalmbach',
    note: 'Trained on real and simulated images to discover roughly 2,000 previously unclassified ring galaxies and study their physical properties.',
    context: 'The Astronomical Journal · Vision + astrophysics',
    links: [
      ['Paper', 'https://arxiv.org/abs/2210.11428'],
      ['Code', 'https://github.com/harishk30/RingGalaxiesCNNAnalysis'],
    ],
  },
  {
    title: 'Predicting Cosmological Parameters from Heterogeneous Graphs of Galaxies',
    authors: 'Harish Krishnakumar, Francisco Villaescusa-Navarro',
    note: 'Built heterogeneous graph neural networks to infer cosmological parameters from simulated galaxy populations.',
    context: 'Center for Computational Astrophysics · Graph ML + cosmology',
    links: [['Code', 'https://github.com/harishk30/CamelsHeteroGNN']],
  },
];

function ExternalLink({ href, children, className = '' }) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function App() {
  const [showAllResearch, setShowAllResearch] = useState(false);
  const [showAllAuthors, setShowAllAuthors] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const visibleResearch = showAllResearch ? research : research.slice(0, 3);

  return (
    <div className="site-shell">
      <NBodyBackground theme={theme} />

      <header className="page-topbar">
        <a className="wordmark" href="#top" aria-label="Back to the top">
          Harish Krishnakumar
        </a>
        <nav className="small-nav" aria-label="Primary navigation">
          <ExternalLink href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing">
            CV
          </ExternalLink>
          <ExternalLink href="https://open.substack.com/pub/harishkk">Writing</ExternalLink>
          <Link to="/photography">Photography</Link>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </nav>
      </header>

      <main className="content-column" id="top">
        <section className="intro-section" aria-labelledby="intro-title">
          <h1 id="intro-title">Harish Krishnakumar</h1>
          <div className="bio-stack">
            <p className="bio-paragraph">
              I’m a rising senior at Princeton studying computer science and physics, and an RL
              research resident at <ExternalLink className="inline-link" href="https://www.primeintellect.ai/">Prime Intellect</ExternalLink>.
              {' '}I’m interested in reinforcement learning, multimodal reasoning, and using AI to
              accelerate science.
            </p>
            <p className="bio-paragraph">
              My current research, advised by <ExternalLink className="inline-link" href="https://liuzhuang13.github.io/">Zhuang Liu</ExternalLink>,
              {' '}focuses on training scientific agents for long-horizon automated research. Previously,
              I worked on inference for speech-to-speech models at{' '}
              <ExternalLink className="inline-link" href="https://www.amazon.jobs/content/en/teams/agi">Amazon AGI</ExternalLink>;
              {' '}my earlier projects span multimodal reasoning, computer vision, and astrophysics.
            </p>
          </div>
          <div className="contact-row" aria-label="Contact and profiles">
            <a href="mailto:hkrishnakumar@princeton.edu">Email</a>
            <ExternalLink href="https://github.com/harishk30">GitHub</ExternalLink>
            <ExternalLink href="https://scholar.google.com/citations?user=wNnR_PAAAAAJ&hl=en">
              Scholar
            </ExternalLink>
            <ExternalLink href="https://www.linkedin.com/in/harish-krishnakumar-aa240b196/">
              LinkedIn
            </ExternalLink>
          </div>
        </section>

        <section className="research-section" id="research" aria-labelledby="research-title">
          <div className="section-heading">
            <h2 id="research-title">Selected research</h2>
          </div>

          <div className="research-list">
            {visibleResearch.map((project, index) => (
              <article className="research-item" key={project.title}>
                <div className="research-number" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div>
                  <p className="research-context">{project.context}</p>
                  <h3>{project.title}</h3>
                  <p className="research-authors">
                    {project.fullAuthors && showAllAuthors ? project.fullAuthors : project.authors}
                    {project.fullAuthors && !showAllAuthors && (
                      <>
                        {', '}
                        <button
                          className="inline-disclosure"
                          type="button"
                          onClick={() => setShowAllAuthors(true)}
                          aria-expanded="false"
                        >
                          et al.
                        </button>
                      </>
                    )}
                    {project.fullAuthors && showAllAuthors && (
                      <button
                        className="inline-disclosure collapse-authors"
                        type="button"
                        onClick={() => setShowAllAuthors(false)}
                        aria-expanded="true"
                      >
                        show fewer
                      </button>
                    )}
                  </p>
                  <p className="research-note">{project.note}</p>
                  <div className="research-links" aria-label={`Links for ${project.title}`}>
                    {project.links.map(([label, href]) => (
                      <ExternalLink href={href} key={label}>
                        {label} <span aria-hidden="true">↗</span>
                      </ExternalLink>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            <button
              className="show-more-button"
              type="button"
              onClick={() => setShowAllResearch((value) => !value)}
              aria-expanded={showAllResearch}
            >
              <span>{showAllResearch ? 'Show less' : 'Show more'}</span>
              <span aria-hidden="true">{showAllResearch ? '−' : '+'}</span>
            </button>
          </div>
          <p className="equal-note">* equal contribution</p>
        </section>

        <section className="writing-section" aria-labelledby="writing-title">
          <div className="section-heading">
            <h2 id="writing-title">Writing</h2>
          </div>
          <ExternalLink
            className="writing-link"
            href="https://open.substack.com/pub/harishkk/p/sidekick-from-passive-to-proactive?r=75hdfc&utm_campaign=post&utm_medium=web"
          >
            <span>
              <strong>Sidekick: From Passive to Proactive Assistants</strong>
              <small>What changes when systems help at the right moment, without being asked?</small>
            </span>
            <span aria-hidden="true">↗</span>
          </ExternalLink>
        </section>
      </main>

      <footer className="site-footer">
        <span>© 2026 Harish Krishnakumar</span>
      </footer>
    </div>
  );
}

export default App;
