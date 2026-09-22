import source from './source-document.json';
import { Plot } from './reader';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle, { useTheme } from '../../ThemeToggle';
import './article.css';
import { TraceExamples } from './traces';
const figures = {
    'kix.8tw930gv76hy': { kind: 'overall', caption: 'Pass@1 and Pass@8 across model sizes' },
    'kix.g2gztivq6a6d': { kind: 'pass1', caption: 'Pass@1 by problem category' },
    'kix.bivcug1ekzwq': { kind: 'pass8', caption: 'Pass@8 by problem category. Bars show pointwise 95% Wilson confidence intervals over problems (perception: n = 735; relational: n = 761; reasoning: n = 317; knowledge: n = 187).' },
    'kix.54z9fnwapje3': { kind: 'histogram', caption: 'Qwen-3.6 27B rollout outcomes with and without the Codex harness' },
    'kix.gyy0ewwv8oru': { kind: 'scaffolding', caption: 'Qwen-3.6 27B Pass@1 and Pass@8 with and without the Codex harness' },
    'kix.iva6ocwni2zy': { kind: 'categoryDeltas', caption: 'Change in Pass@1 and Pass@8 by category with the Codex harness' },
    'kix.9gkikr752avz': { kind: 'turns', caption: 'Average assistant turns per rollout, grouped by problem outcome across eight rollouts' },
    'kix.iz4t8osnmbm8': { kind: 'effects', caption: 'Change in Pass@1 and Pass@8 from scaling 4B to 27B and adding the visual-tool harness at 27B' },
};
function slug(text) { return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''); }
function inline(elements) {
    return elements.map((element, index) => {
        const run = element.textRun;
        if (!run)
            return null;
        let node = run.content.replace(/\n$/, '');
        if (run.textStyle?.bold)
            node = <strong>{node}</strong>;
        if (run.textStyle?.italic)
            node = <em>{node}</em>;
        const url = run.textStyle?.link?.url;
        if (url && /^https?:\/\//.test(url))
            node = <a href={url}>{node}</a>;
        return <span key={index}>{node}</span>;
    });
}
export default function Article() {
    const { theme, toggleTheme } = useTheme();
    useEffect(() => {
        const previous = document.title;
        document.title = 'Is Bigger Always Better? | Harish Krishnakumar';
        return () => { document.title = previous; };
    }, []);
    const paragraphs = source.paragraphs;
    const title = paragraphs.find((p) => p.paragraphStyle?.namedStyleType === 'TITLE');
    const sections = paragraphs.filter(p => p.paragraphStyle?.namedStyleType === 'SUBTITLE').map(p => p.elements.map(e => e.textRun?.content || '').join('').trim());
    const blocks = [];
    let list = [];
    let figureIndex = 0;
    function flushList() {
        if (list.length) {
            blocks.push(<ul className="category-list" key={`list-${blocks.length}`}>{list}</ul>);
            list = [];
        }
    }
    for (const [index, paragraph] of paragraphs.entries()) {
        if (paragraph.paragraphStyle?.namedStyleType === 'TITLE')
            continue;
        const text = paragraph.elements.map((e) => e.textRun?.content || '').join('').trim();
        const image = paragraph.elements.find((e) => e.inlineObjectElement)?.inlineObjectElement;
        if (!text && !image)
            continue;
        if (paragraph.bullet) {
            list.push(<li key={index}>{inline(paragraph.elements)}</li>);
            continue;
        }
        flushList();
        if (text === '(embed in trajectory examples of where scaffolding takes responses from 0/8 -> some solved here)') {
            blocks.push(<p key={`${index}-introduction`} className="trace-introduction">A few examples of harness use are shown below:</p>);
            blocks.push(<TraceExamples key={index}/>);
            continue;
        }
        if (image) {
            const figure = figures[image.inlineObjectId];
            if (!figure)
                throw new Error(`Missing document figure: ${image.inlineObjectId}`);
            blocks.push(<Plot key={index} {...figure} number={++figureIndex}/>);
        }
        else if (paragraph.paragraphStyle?.namedStyleType === 'SUBTITLE') {
            blocks.push(<h2 id={slug(text)} key={index}>{inline(paragraph.elements)}</h2>);
        }
        else {
            blocks.push(<p key={index}>{inline(paragraph.elements)}</p>);
        }
    }
    flushList();
    return <div className="worldbench-page">
    <a className="skip-link" href="#article">Skip to article</a>
    <header className="page-topbar">
      <Link className="wordmark" to="/">Harish Krishnakumar</Link>
      <nav className="small-nav" aria-label="Primary navigation">
        <a href="https://drive.google.com/file/d/1YdKi_LyDbFa8svTUyrGwNRLmzmwi1Bru/view?usp=sharing">CV</a>
        <a href="https://open.substack.com/pub/harishkk">Writing</a>
        <Link to="/photography">Photography</Link>
        <ThemeToggle theme={theme} onToggle={toggleTheme}/>
      </nav>
    </header>
    <main id="article" className="article-shell"><article>
      <header className="article-header">
        <div className="section-heading article-section-heading"><span>Writing</span></div>
        <h1>{inline(title.elements)}</h1>
        <nav className="article-contents" aria-labelledby="contents-label">
          <div id="contents-label" className="contents-label">Table of contents</div>
          <ol>{sections.map(section => <li key={slug(section)}><a href={`#${slug(section)}`}>{section}</a></li>)}</ol>
        </nav>
      </header>
      <div className="article-body">{blocks}</div>
    </article></main>
    <footer className="site-footer"><span>© 2026 Harish Krishnakumar</span><a href="#article">Back to top ↑</a></footer>
  </div>;
}
