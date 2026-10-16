import { Fragment, useId, useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Crop, Maximize2, X, ChevronDown } from 'lucide-react';
import example from './luna-example.json';

function Caption({ number, children }) {
  return <figcaption><span className="figure-number">Figure {number}</span><span>{children}</span></figcaption>;
}

function Arrow({ className = '' }) {
  return <span className={`diagram-arrow ${className}`} aria-hidden="true"><ArrowRight size={16} /></span>;
}

function Tokens({ visual = false }) {
  return <div className={`encoding-tokens ${visual ? 'visual-tone' : 'prompt-tone'}`}>
    <span>{visual ? 'Image tokens' : 'Text tokens'}</span>
    <div aria-hidden="true">{[0,1,2,3].map(i => <i key={i} />)}</div>
  </div>;
}

export function EncoderDiagram() {
  return <figure className="composition-figure encoder-figure">
    <div className="encoding-overview" role="img" aria-label="Image: vision encoder, projector, image tokens. Prompt: text tokens. The language model processes both and returns an answer.">
      <div className="encoding-inputs">
        <div className="encoding-row">
          <span className="encoding-source"><ImageIcon size={19} aria-hidden="true" />Image</span><Arrow />
          <span className="encoding-node visual-tone">Vision encoder</span><Arrow />
          <span className="encoding-node visual-tone">Projector</span><Arrow /><Tokens visual />
        </div>
        <div className="encoding-row">
          <span className="encoding-source">Prompt</span><span className="prompt-connector" aria-hidden="true" /><Tokens />
        </div>
      </div>
      <span className="encoding-join" aria-hidden="true" /><Arrow className="encoding-exit" />
      <span className="encoding-node model-tone encoding-llm">LLM</span><Arrow className="encoding-exit" /><span className="encoding-answer">Answer</span>
    </div>
    <Caption number={1}>Image and text inputs become token representations that the language model processes together.</Caption>
  </figure>;
}

function ImageView({ src, alt }) {
  const dialog = useRef(null);
  return <div className="composition-image">
    <button className="image-open" type="button" title="Enlarge image" aria-label={`Enlarge: ${alt}`} onClick={() => dialog.current.showModal()}>
      <img src={src} alt={alt} loading="lazy" /><Maximize2 size={15} className="image-open-icon" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="composition-image-dialog" aria-label={alt} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <button className="image-close" type="button" title="Close image" aria-label="Close image" onClick={() => dialog.current.close()}><X size={21} /></button>
      <img src={src} alt={alt} />
    </dialog>
  </div>;
}

const commonInput = { title:'Image + question', tone:'visual-tone', icon:ImageIcon, image:example.original_image, summary:example.question, input:true };
const noHarness = [
  { ...commonInput, id:'null-input' },
  { id:'null-reason',title:'Reason over the full image',tone:'model-tone',summary:example.null.summary,text:example.null.text,wide:true },
  { id:'null-answer',title:'Answer',tone:'answer-tone',summary:example.null.summary,text:example.null.text },
];
const withHarness = [
  { ...commonInput, id:'harness-input' },
  ...example.harness.steps.map((step,i)=>({ ...step,id:`crop-${i}`,title:i===0?'Inspect a region':'Inspect another',detailTitle:step.title,tone:'visual-tone',icon:Crop })),
  { id:'combine',title:'Combine evidence',tone:'model-tone',summary:example.harness.summary,text:example.harness.text },
  { id:'harness-answer',title:'Answer',tone:'answer-tone',summary:example.harness.summary,text:example.harness.text },
];

export function HarnessComparison() {
  const panelId = useId();
  const [selected, setSelected] = useState(null);
  const lastTrigger = useRef(null);
  function close() { setSelected(null);lastTrigger.current?.focus(); }
  function lane(label, steps, harness) {
    return <section className="concept-lane" aria-label={label}>
      <h3>{label}</h3>
      <div className="concept-sequence">
        {steps.map((step,i)=><Fragment key={step.id}>
          {i>0 && <Arrow />}
          <button type="button" className={`concept-block ${step.tone} ${step.wide?'wide-block':''}`}
            aria-label={`${label}: ${step.title}. Show Luna example`} aria-expanded={selected?.id===step.id} aria-controls={panelId}
            onClick={e=>{lastTrigger.current=e.currentTarget;setSelected(selected?.id===step.id?null:{...step,harness});}}>
            {step.icon && <step.icon size={16} aria-hidden="true" />}<span>{step.title}</span><ChevronDown size={12} className="block-expand" aria-hidden="true" />
          </button>
        </Fragment>)}
      </div>
    </section>;
  }
  return <figure className="composition-figure comparison-figure">
    <div className="concept-comparison">
      {lane('No harness',noHarness,false)}
      {lane('With a harness',withHarness,true)}
    </div>
    <Caption number={2}>A harness can turn a single global question into a sequence of local inspections, then combine their evidence into an answer.</Caption>
    <div id={panelId} hidden={!selected} className="example-disclosure" role="region" aria-label="Luna example" onKeyDown={e=>{if(e.key==='Escape' && !e.target.closest('dialog')){e.stopPropagation();close();}}}>
      {selected && <>
        <div className="example-heading"><div><strong>Luna example</strong><span>{selected.harness?'With a harness':'No harness'} · High reasoning · {selected.harness?'6/8':'0/8'} correct</span></div>
          <button className="example-close" type="button" title="Close example" aria-label="Close example" onClick={close}><X size={18} /></button>
        </div>
        <div className={`example-content ${selected.image?'has-image':''}`}>
          {selected.image && <ImageView src={selected.image} alt={selected.detailTitle || selected.title} />}
          <div className="example-text">
            <h4>{selected.detailTitle || selected.title}</h4><p>{selected.summary}</p>
            {selected.input && <ul className="example-options">{Object.entries(example.options).map(([letter,value])=><li key={letter}><strong>{letter}</strong> {value}</li>)}</ul>}
            {selected.text && <><blockquote>{selected.text}</blockquote><span className="example-reference">Reference answer: {example.answer}</span></>}
            {selected.command && <details className="step-evidence"><summary><ChevronDown size={13} aria-hidden="true" />Tool call</summary><pre><code>{selected.command}</code></pre>{selected.view_call && <pre><code>{selected.view_call}</code></pre>}</details>}
          </div>
        </div>
        <p className="example-note">Actual saved images and responses. One selected rollout per condition; counts summarize eight attempts. The harness uses four model calls rather than one.</p>
      </>}
    </div>
  </figure>;
}
