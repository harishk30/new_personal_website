import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle, { useTheme } from '../../ThemeToggle';
import source from './source-document.json';
import { EncoderDiagram, HarnessComparison } from './diagrams';
import { ScalingPlot, CategoryPlot, QwenHarnessPlot, LunaEffortPlot, LunaRescuePlot, LunaBehaviorPlot } from './plots';
import { QwenExamples, LunaExample } from './examples';
import '../improving-vlms/article.css';
import './composition.css';

const writingNotes = {
  'reliable-gains': [
    'Lead with Figure 6: at medium effort, the harness raises Luna Pass@1 from 56.0% to 61.2% and Pass@8 from 75.9% to 81.9%. At xhigh, these rise from 57.1% to 63.5% and 75.4% to 82.4%. Unlike the two evaluated Qwen comparisons, coverage gains accompany more reliable individual attempts.',
    'Keep the low-effort exception: the harness lowers both scores there. The useful contrast is the gain at medium effort and above, not a claim that every increase in effort helps. Use the paired gain intervals, rather than overlapping intervals for two separate scores, to discuss uncertainty.',
    'Use Figure 7 to distinguish a one-off rescue from repeated success. At xhigh, 211 of the 492 questions missed in all eight no-harness attempts are solved at least once with the harness; 21 are solved in all eight attempts. Most rescued questions are not yet consistently solved.',
    'Explain that each curve starts from that effort\'s own set of 0/8 questions. The sets differ, so these curves do not track one fixed cohort improving with effort. A 0/8 result is an observed miss across eight attempts, not proof that a solution is impossible.',
  ],
  reasoning: [
    'Connect Figure 8 to the performance change: tool use rises from roughly 6-7% of rollouts at none/low to 42% at medium and 53% at xhigh. Mean model calls rise from about 1.2 to 3.4. More effort changes how the harness is used, not just the length of the final answer.',
    'Walk through Figure 9: none/low choose the wrong word; higher-effort traces locate the highlighted control, inspect its vertical alignment, and answer correctly. High/xhigh inspect the control and instruction banner separately. These are separate runs, not a wrong answer being corrected within one trace. Keep the eight-attempt counts visible: 0/8, 0/8, 8/8, 7/8, 8/8.',
    'Distinguish useful decomposition from activity: more calls or longer reasoning are not inherently better. The example should show whether an inspection resolves a specific uncertainty and whether the model correctly combines the observations.',
    'Treat output tokens and effort as associated with these gains, not an isolated explanation for them. A cost- or token-matched comparison is needed to separate longer reasoning from the benefit of new visual observations. These experiments vary inference effort; they do not establish which RL training choices caused the difference.',
  ],
  conclusion: [
    'Bring the two results together: the evaluated Qwen models gain coverage but lose some single-attempt reliability; Luna at medium effort and above improves both. This suggests that harness benefits depend on how the policy uses the tools, rather than access to tools or parameter count alone.',
    'State the compositional-generalization interpretation precisely: targeted inspections can make useful local evidence accessible and allow a model to assemble an answer it missed in a single call. The traces illustrate this mechanism; the aggregate results support its usefulness, but do not prove the local tasks are in-distribution or establish a universal scaling law.',
    'Close with the training opportunity: teach models to choose informative inspections, interpret their outputs, combine evidence, and stop when it is sufficient. Test this with controlled training and a compute-matched visual-inspection ablation: the same prompt and budget, with image inspection enabled versus disabled. Retain failures and test across model families.',
  ],
};

function WritingNotes({ section }) {
  const items = writingNotes[section];
  if (!items) return null;
  return <aside className="writing-notes" aria-labelledby={`notes-${section}`}>
    <div className="writing-notes-label" id={`notes-${section}`}>To write</div>
    <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>
  </aside>;
}

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
    // These two source fragments are expanded into the conclusion writing notes.
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
      blocks.push(<WritingNotes key={`notes-${section}`} section={section} />);
      section = headings.find(([label]) => label.toLowerCase() === text.toLowerCase())[1];
      blocks.push(<h2 key={i} id={section}><Inline paragraph={paragraph} /></h2>);
    } else {
      blocks.push(<p key={i}><Inline paragraph={paragraph} /></p>);
    }
  }
  flushList();
  blocks.push(<WritingNotes key={`notes-${section}`} section={section} />);
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
          </ol>
        </nav>
      </header>
      <div id="introduction" className="article-body">{blocks}</div>
    </article></main>
    <footer className="site-footer"><span>&copy; 2026 Harish Krishnakumar</span><a href="#article">Back to top &uarr;</a></footer>
  </div>;
}
