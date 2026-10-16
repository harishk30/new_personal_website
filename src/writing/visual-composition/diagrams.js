import { useId, useRef, useState } from 'react';
import { ArrowRight, ArrowDown, ScanEye, Braces, Maximize2, X, Check, Minus, ChevronDown } from 'lucide-react';
import example from './luna-example.json';

function Caption({ number, children }) {
  return <figcaption><span className="figure-number">Figure {number}</span><span>{children}</span></figcaption>;
}

function ImageView({ src, alt, className = '' }) {
  const dialog = useRef(null);
  return <div className={`composition-image ${className}`}>
    <button className="image-open" type="button" title="Enlarge image" aria-label={`Enlarge: ${alt}`} onClick={() => dialog.current.showModal()}>
      <img src={src} alt={alt} loading="lazy" />
      <Maximize2 size={15} className="image-open-icon" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="composition-image-dialog" aria-label={alt} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="composition-image-dialog-content">
        <button className="image-close" title="Close image" aria-label="Close image" onClick={() => dialog.current.close()}><X size={21} /></button>
        <img src={src} alt={alt} />
      </div>
    </dialog>
  </div>;
}

function Connector({ className = '' }) {
  return <span className={`composition-arrow ${className}`} aria-hidden="true"><ArrowRight size={22} /></span>;
}

function Tokens({ visual = false }) {
  return <div className={`token-sequence ${visual ? 'visual-tokens' : 'text-tokens'}`}>
    <span>{visual ? 'Image tokens' : 'Text tokens'}</span>
    <div aria-hidden="true">{[0,1,2,3].map(i => <i key={i} />)}</div>
  </div>;
}

export function EncoderDiagram() {
  return <figure className="composition-figure encoder-figure">
    <div className="encoder-flow" role="img" aria-label="An image passes through a vision encoder and projector to become image tokens. The task prompt becomes text tokens. Both feed the language model, which produces an answer.">
      <div className="encoder-inputs">
        <div className="encoding-lane image-lane">
          <div className="diagram-image-input"><img src={example.original_image} alt="" /><span>Image</span></div>
          <Connector />
          <div className="encoding-stack"><div className="diagram-block">Vision encoder</div><ArrowDown size={17} aria-hidden="true" /><div className="diagram-block projector">Projector</div></div>
          <Connector />
          <Tokens visual />
        </div>
        <div className="encoding-lane text-lane">
          <div className="prompt-input"><Braces size={19} aria-hidden="true" /><span>Task prompt</span></div>
          <span className="text-input-line" aria-hidden="true" />
          <Tokens />
        </div>
      </div>
      <span className="input-merge" aria-hidden="true" /><Connector className="merge-arrow" />
      <div className="diagram-block language-model"><span>Large language<br />model</span><span className="llm-label">LLM</span></div>
      <Connector className="answer-arrow" /><div className="diagram-answer">Answer</div>
    </div>
    <Caption number={1}>Image and text inputs become token representations that the language model processes together.</Caption>
  </figure>;
}

export function HarnessComparison() {
  const id = useId();
  const [active, setActive] = useState('input');
  const triggers = useRef({});
  const steps = [
    { id:'input',title:'Original image',summary:example.question,image:example.original_image,kind:'input' },
    { id:'null',title:'Answer without tools',summary:example.null.summary,exact_text:example.null.text,kind:'null' },
    ...example.harness.steps.map((step, i) => ({...step,id:`step-${i}`,kind:'tool'})),
    { id:'answer',title:'Combine and answer',summary:example.harness.summary,exact_text:example.harness.text,kind:'answer' },
  ];
  const selected = steps.find(s => s.id === active);
  function move(event) {
    const index = steps.findIndex(s => s.id === active);
    let next;
    if(event.key==='ArrowRight' || event.key==='ArrowDown') next=(index+1)%steps.length;
    else if(event.key==='ArrowLeft' || event.key==='ArrowUp') next=(index+steps.length-1)%steps.length;
    else if(event.key==='Home') next=0;
    else if(event.key==='End') next=steps.length-1;
    else return;
    event.preventDefault();setActive(steps[next].id);triggers.current[steps[next].id]?.focus();
  }
  function trigger(step, children, className = '') {
    return <button key={step.id} ref={el => { triggers.current[step.id]=el; }} type="button"
      className={`trace-node ${className}`} role="tab" id={`${id}-${step.id}`} aria-selected={active===step.id}
      aria-controls={`${id}-inspection`} tabIndex={active===step.id?0:-1}
      onMouseEnter={()=>setActive(step.id)} onFocus={()=>setActive(step.id)} onClick={()=>setActive(step.id)} onKeyDown={move}>
      {children}
    </button>;
  }
  return <figure className="composition-figure comparison-figure">
    <div className="comparison-question">
      <div className="comparison-kicker">Luna <span>{example.effort} reasoning</span></div>
      <p>{example.question}</p>
      <ul className="composition-options">{Object.entries(example.options).map(([letter,value])=><li key={letter}><strong>{letter}</strong> {value}</li>)}</ul>
    </div>
    <div className="comparison-paths" role="tablist" aria-label="Inspect the matched example" aria-orientation="horizontal">
      {trigger(steps[0],<><img src={example.original_image} alt="Original question image" /><div><span className="trace-node-label">Original image + task prompt</span><span className="shared-input-note">Same question in both conditions</span></div><ScanEye size={20} aria-hidden="true" /></>,'shared-input')}
      <div className="comparison-lane no-harness-lane">
        <div className="lane-label"><strong>No harness</strong><span>{example.null.successes}/{example.null.total} successful rollouts</span></div>
        <div className="lane-path">
          <div className="plain-model-node">Image + prompt<Connector /><span>LLM</span></div>
          <Connector />
          {trigger(steps[1],<><Minus size={16} aria-hidden="true" /><span>Answer: {example.null.answer}</span></>,'answer-node incorrect')}
        </div>
      </div>
      <div className="comparison-lane harness-lane">
        <div className="lane-label"><strong>Harness</strong><span>{example.harness.successes}/{example.harness.total} successful rollouts</span></div>
        <div className="harness-path">
          {steps.filter(s=>s.kind==='tool').map((step,i)=><div className="tool-path-step" key={step.id}>
            {trigger(step,<><span className="step-number">{String(i+1).padStart(2,'0')}</span>{step.image?<img src={step.image} alt="" />:<ScanEye size={26} aria-hidden="true" />}<span className="trace-node-label">{step.title}</span></>,'tool-node')}
            <Connector />
          </div>)}
          {trigger(steps.at(-1),<><Check size={17} aria-hidden="true" /><span>Answer: {example.harness.answer}</span></>,'answer-node correct')}
        </div>
      </div>
    </div>
    <div className="composition-inspector" role="tabpanel" tabIndex={0} id={`${id}-inspection`} aria-labelledby={`${id}-${active}`}>
      <div className="inspector-heading"><span>{selected.title}</span><span className="reference-answer">Reference: {example.answer}</span></div>
      <div className={`inspector-content ${selected.image?'has-image':''}`}>
        {selected.image && <ImageView src={selected.image} alt={selected.title} />}
        <div className="inspector-text">
          <p>{selected.summary}</p>
          {(selected.exact_text || selected.command) && <details key={selected.id} className="step-evidence"><summary><ChevronDown size={14} aria-hidden="true" />{selected.command?'Tool call':'Model response'}</summary>
            {selected.exact_text && <blockquote>{selected.exact_text}</blockquote>}
            {selected.command && <pre><code>{selected.command}</code></pre>}
            {selected.view_call && <pre><code>{selected.view_call}</code></pre>}
          </details>}
        </div>
      </div>
    </div>
    <Caption number={2}>{example.caption} The steps show a selected successful harness rollout and a failed one-turn rollout; counts summarize all eight attempts per condition.</Caption>
  </figure>;
}
