import { createElement, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';
import ThemeToggle, { useTheme } from '../../ThemeToggle';
import source from './source-document.json';
import ArticleCitation from '../agent-swarms-still-herd-after-rl/citation';
import '../improving-vlms/article.css';
import '../agent-swarms-still-herd-after-rl/article.css';
import './article.css';

const bibtex = `@article{2026deepresearchagent,
  title  = {Training a Frontier Deep Research Agent: Synthetic Data, {SFT}, {RL}, and Inference-Time Scaling},
  year   = {2026},
  month  = {November},
  url    = {https://www.harishkk.com/writing/deep-research-agent}
}`;

const publishedLabel = new Date(source.published).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Figure({ image, onExpand, eager = false }) {
  if (image.variant === 'equation') {
    return <figure className="research-equation">
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />
    </figure>;
  }
  return <figure className="swarm-figure">
    <button className="swarm-image-open" type="button" onClick={() => onExpand(image)} aria-label={`Enlarge figure: ${image.alt}`}>
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading={eager ? 'eager' : 'lazy'} decoding="async" />
      <span className="swarm-image-hint" aria-hidden="true"><Expand size={16} /> Enlarge</span>
    </button>
  </figure>;
}

function Content({ node, onExpand }) {
  if (typeof node === 'string') return node;
  const children = node.children.map((child, index) => <Content key={index} node={child} onExpand={onExpand} />);
  if (node.tag === 'img') return <Figure image={node.props} onExpand={onExpand} />;
  return createElement(node.tag, node.props, children);
}

export default function Article() {
  const { theme, toggleTheme } = useTheme();
  const [expandedImage, setExpandedImage] = useState(null);
  const dialog = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content');
    document.title = `${source.title} | Harish Krishnakumar`;
    meta?.setAttribute('content', source.description);
    return () => {
      document.title = previousTitle;
      if (previousDescription !== null && previousDescription !== undefined) meta?.setAttribute('content', previousDescription);
    };
  }, []);

  useEffect(() => {
    if (!expandedImage) return undefined;
    dialog.current.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [expandedImage]);

  const closeImage = () => dialog.current.close();
  return <div className="worldbench-page swarm-page research-agent-page">
    <a className="skip-link" href="#article">Skip to article</a>
    <header className="page-topbar">
      <Link className="wordmark" to="/">Harish Krishnakumar</Link>
      <nav className="small-nav" aria-label="Primary navigation">
        <a href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing">CV</a>
        <a href="/#blog">Blog</a>
        <a href="/#research">Research</a>
        <Link to="/photography">Photography</Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>
    </header>
    <main id="article" className="article-shell"><article>
      <header className="article-header">
        <div className="swarm-heading">
          <div className="section-heading article-section-heading"><a href="/#blog">Blog</a></div>
          <h1>{source.title}</h1>
          <p className="swarm-publication research-agent-date"><time dateTime={source.published}>{publishedLabel}</time></p>
        </div>
        <Figure image={source.hero.props} onExpand={setExpandedImage} eager />
        <nav className="article-contents" aria-labelledby="contents-label">
          <div id="contents-label" className="contents-label">Table of contents</div>
          <ol>
            <li><a href="#introduction">Introduction</a></li>
            {source.sections.map(section => <li key={section.id}>
              <a href={`#${section.id}`}>{section.title}</a>
              {section.subsections && <ol className="contents-subsections">
                {section.subsections.map(sub => <li key={sub.id}><a href={`#${sub.id}`}>{sub.title}</a></li>)}
              </ol>}
            </li>)}
            <li><a href="#citation">Citation</a></li>
          </ol>
        </nav>
      </header>
      <div id="introduction" className="article-body">
        {source.children.map((node, index) => <Content key={index} node={node} onExpand={setExpandedImage} />)}
        <ArticleCitation text={bibtex} />
      </div>
    </article></main>
    <footer className="site-footer"><span>© 2026 Harish Krishnakumar</span><a href="#article">Back to top ↑</a></footer>
    <dialog
      ref={dialog}
      className="swarm-image-dialog"
      aria-label="Enlarged article figure"
      onClose={() => setExpandedImage(null)}
      onClick={event => { if (event.target === dialog.current) closeImage(); }}
    >
      {expandedImage && <>
        <div className="swarm-image-toolbar">
          <a href={expandedImage.src} target="_blank" rel="noreferrer">Open original image ↗</a>
          <button type="button" onClick={closeImage} aria-label="Close enlarged figure" autoFocus><X size={20} /></button>
        </div>
        <div className="swarm-image-scroll" role="region" aria-label="Full-size figure, scroll to explore" tabIndex={0}>
          <img src={expandedImage.src} alt={expandedImage.alt} width={expandedImage.width} height={expandedImage.height} />
        </div>
      </>}
    </dialog>
  </div>;
}
