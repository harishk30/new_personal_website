import { createElement, Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Expand, X } from 'lucide-react';
import ThemeToggle, { useTheme } from '../../ThemeToggle';
import source from './source-document.json';
import ArticleCitation from './citation';
import '../improving-vlms/article.css';
import './article.css';

function Figure({ image, onExpand, eager = false }) {
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
  if (node.tag === 'p' && node.children.some(child => child.tag === 'img')) return <>{children}</>;
  if (node.tag === 'table') return <div className="swarm-table-scroll" role="region" aria-label="Appendix data table, scroll horizontally to read all columns" tabIndex={0}>
    <table>{children}</table>
  </div>;
  if (node.tag === 'th') return <th scope="col">{children}</th>;
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
  return <div className="worldbench-page swarm-page">
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
          <p className="swarm-byline">
            {source.authors.map((author, index) => <Fragment key={author.url}>
              {index > 0 && ' and '}<a href={author.url} rel="author">{author.name}</a>
            </Fragment>)}
          </p>
          <p className="swarm-publication"><time dateTime={source.published}>November 17, 2026</time><span aria-hidden="true"> · </span><a href={source.sourceUrl}>Also on Ashton’s blog</a></p>
        </div>
        <Figure image={source.hero.props} onExpand={setExpandedImage} eager />
        <nav className="article-contents" aria-labelledby="contents-label">
          <div id="contents-label" className="contents-label">Table of contents</div>
          <ol>
            <li><a href="#introduction">Introduction</a></li>
            {source.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}
            <li><a href="#citation">Citation</a></li>
          </ol>
        </nav>
      </header>
      <div id="introduction" className="article-body">
        {source.children.map((node, index) => <Content key={index} node={node} onExpand={setExpandedImage} />)}
        <ArticleCitation />
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
