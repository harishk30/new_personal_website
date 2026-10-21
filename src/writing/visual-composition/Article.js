import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle, { useTheme } from '../../ThemeToggle';
import source from './source-document.json';
import { EncoderDiagram, HarnessComparison } from './diagrams';
import { ScalingPlot, CategoryPlot, QwenHarnessPlot, LunaEffortPlot, LunaRescuePlot, LunaBehaviorPlot } from './plots';
import { QwenExamples, LunaExample } from './examples';
import ArticleCitation from './citation';
import '../improving-vlms/article.css';
import './composition.css';

function textOf(paragraph) {
  return paragraph.elements.map(e => e.textRun?.content || '').join('').trim();
}

function Inline({ paragraph }) {
  return paragraph.elements.map((element, i) => {
    const run = element.textRun;
    if (!run) return null;
    let text = run.content.replace(/\n$/, '').replace('four different reasoning levels', 'five different reasoning levels');
    const variable = /^([SO])(\s*)$/.exec(text);
    if (variable) {
      text = <><var className="inline-math">{variable[1]}</var>{variable[2]}</>;
    } else {
      if (run.textStyle?.bold) text = <strong>{text}</strong>;
      if (run.textStyle?.italic) text = <em>{text}</em>;
    }
    const href = run.textStyle?.link?.url;
    if (href && /^https?:\/\//.test(href)) text = <a href={href}>{text}</a>;
    return <span key={i}>{text}</span>;
  });
}

export default function Article() {
  const { theme, toggleTheme } = useTheme();
  const title = source.paragraphs[0];
  const subtitle = source.paragraphs[1];
  useEffect(() => {
    const previous = document.title;
    document.title = 'Visual Harnesses Are Compositional Generalizers | Harish Krishnakumar';
    return () => { document.title = previous; };
  }, []);
  const blocks = [];
  const headings = [
    ['Why is Decomposition Useful in Vision?', 'why-decomposition'],
    ['What Improves With Scale?', 'scale'],
    ['Reachability vs Reliability', 'reachability'],
    ['Making Harness Gains Reliable', 'reliable-gains'],
    ['What Changes With Reasoning?', 'reasoning'],
    ['Conclusion', 'conclusion'],
    ['Acknowledgements', 'acknowledgements'],
  ];
  const figures = [
    ['(overall scaling', ScalingPlot], ['(category-level', CategoryPlot],
    ['(Use two aligned', QwenHarnessPlot], ['(embed in trajectory', QwenExamples],
    ['(Luna reasoning effort', LunaEffortPlot], ['(0 ->', LunaRescuePlot],
    ['(tool-use rate', LunaBehaviorPlot], ['(Luna trace example', LunaExample],
  ];
  let skippingCue = false;
  let section = 'introduction';
  let listItems = [];
  function flushList() {
    if (!listItems.length) return;
    blocks.push(<ul className="category-list" key={`list-${blocks.length}`}>{listItems}</ul>);
    listItems = [];
  }
  for (const [i, paragraph] of source.paragraphs.entries()) {
    if (i < 2) continue;
    const text = textOf(paragraph);
    const image = paragraph.elements.find(e => e.inlineObjectElement)?.inlineObjectElement;
    if (!text && !image) continue;
    if (skippingCue) {
      if (text.endsWith(')')) skippingCue = false;
      continue;
    }
    // Drafting cues stay in the source snapshot, not the published article.
    if (section === 'conclusion' && (text === 'Qwen vs. Luna' || text.startsWith('Harness provides transformations'))) continue;
    if (paragraph.bullet) {
      listItems.push(<li key={i}><Inline paragraph={paragraph} /></li>);
      continue;
    }
    flushList();
    const replacement = figures.find(([prefix]) => text.startsWith(prefix));
    if (replacement) {
      const Component = replacement[1];
      blocks.push(<Component key={i} />);
      skippingCue = !text.endsWith(')');
      continue;
    }
    // Diagram instructions remain in the source snapshot, not the article.
    if (text.startsWith('(Generate a version') || text.startsWith('(rework these diagrams')) continue;
    if (image) {
      if (image.inlineObjectId === 'kix.abxcmli6i6c') blocks.push(<EncoderDiagram key={i} />);
      else if (image.inlineObjectId === 'kix.tpmsq37gadx0') blocks.push(<HarnessComparison key={i} />);
      else throw new Error(`Unmapped article figure: ${image.inlineObjectId}`);
    } else if (headings.some(([label]) => label.toLowerCase() === text.toLowerCase())) {
      section = headings.find(([label]) => label.toLowerCase() === text.toLowerCase())[1];
      blocks.push(<h2 key={i} id={section}><Inline paragraph={paragraph} /></h2>);
    } else {
      blocks.push(<p key={i}><Inline paragraph={paragraph} /></p>);
    }
  }
  flushList();
  return <div className="worldbench-page composition-page">
    <a className="skip-link" href="#article">Skip to article</a>
    <header className="page-topbar">
      <Link className="wordmark" to="/">Harish Krishnakumar</Link>
      <nav className="small-nav" aria-label="Primary navigation">
        <a href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing">CV</a>
        <a href="https://open.substack.com/pub/harishkk">Writing</a>
        <Link to="/photography">Photography</Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </nav>
    </header>
    <main id="article" className="article-shell"><article>
      <header className="article-header">
        <div className="section-heading article-section-heading"><span>Writing</span></div>
        <h1><Inline paragraph={title} /></h1>
        <p className="composition-subtitle"><Inline paragraph={subtitle} /></p>
        <nav className="article-contents" aria-labelledby="contents-label">
          <div id="contents-label" className="contents-label">Table of contents</div>
          <ol>
            <li><a href="#introduction">Introduction</a></li>
            {headings.map(([label, id]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
            <li><a href="#citation">Citation</a></li>
            <li><a href="#references">References</a></li>
          </ol>
        </nav>
      </header>
      <div id="introduction" className="article-body">{blocks}<ArticleCitation /></div>
    </article></main>
    <footer className="site-footer"><span>&copy; 2026 Harish Krishnakumar</span><a href="#article">Back to top &uarr;</a></footer>
  </div>;
}
