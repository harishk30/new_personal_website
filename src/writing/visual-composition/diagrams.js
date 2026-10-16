import { useId, useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, Maximize2, X, ChevronDown } from 'lucide-react';
import example from './luna-example.json';

function Caption({ number, children }) {
  return <figcaption><span className="figure-number">Figure {number}</span><span>{children}</span></figcaption>;
}

export function EncoderDiagram() {
  const marker = useId().replace(/:/g,'');
  return <figure className="composition-figure encoder-figure">
    <div className="illustration-scroll" tabIndex={0} role="group" aria-label="Horizontal vision-language model diagram">
      <svg className="encoder-illustration" width="720" height="188" viewBox="0 0 720 188" role="img" aria-labelledby={`${marker}-title ${marker}-desc`}>
        <title id={`${marker}-title`}>Image and question flow into a language model</title>
        <desc id={`${marker}-desc`}>Left to right: the image passes through a vision encoder and projector to become image tokens. The question becomes text tokens. Both token streams enter the language model, which produces an answer.</desc>
        <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="var(--diagram-wire)" /></marker></defs>
        <g fill="none" stroke="var(--diagram-wire)" strokeWidth="1.2" markerEnd={`url(#${marker})`}>
          <path d="M66 50 H86" /><path d="M200 50 H220" /><path d="M308 50 H332" />
          <path d="M92 139 H332" /><path d="M412 50 H432 V94 H456" /><path d="M412 139 H432 V94 H456" /><path d="M594 94 H626" />
        </g>
        <rect x="0" y="24" width="66" height="52" fill="var(--diagram-image)" />
        <text x="33" y="55" className="illustration-label">Image</text>
        <rect x="92" y="24" width="108" height="52" className="neutral-module" />
        <path d="M92 24 H200" stroke="var(--diagram-image)" strokeWidth="3" />
        <text x="146" y="55" className="module-label">Vision encoder</text>
        <rect x="226" y="24" width="82" height="52" className="neutral-module" />
        <path d="M226 24 H308" stroke="var(--diagram-image)" strokeWidth="3" />
        <text x="267" y="55" className="module-label">Projector</text>
        <text x="374" y="15" className="token-label">Image tokens</text>
        {[0,1,2,3].map(i=><rect key={`image-${i}`} x={340+i*18} y="31" width="14" height="38" fill="var(--diagram-image)" />)}
        <rect x="0" y="119" width="92" height="40" fill="var(--diagram-prompt)" />
        <text x="46" y="144" className="illustration-label">Question</text>
        <text x="374" y="108" className="token-label">Text tokens</text>
        {[0,1,2,3].map(i=><rect key={`text-${i}`} x={340+i*18} y="120" width="14" height="38" fill="var(--diagram-prompt)" />)}
        <rect x="462" y="64" width="132" height="60" fill="var(--diagram-reason)" />
        <text x="528" y="91" className="illustration-label"><tspan x="528">Language model</tspan><tspan x="528" dy="18" className="illustration-small">LLM</tspan></text>
        <rect x="634" y="74" width="86" height="40" fill="var(--diagram-answer)" />
        <text x="677" y="99" className="illustration-label">Answer</text>
      </svg>
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

const commonInput = { image:example.original_image, summary:example.question, input:true };
const noHarness = [
  { ...commonInput, id:'null-image',title:'Image',tone:'image-segment' },
  { ...commonInput, id:'null-question',title:'Question',tone:'prompt-segment' },
  { id:'null-reason',title:'Reasoning',tone:'reason-segment',summary:example.null.summary,text:example.null.text },
];
const withHarness = [
  { ...commonInput, id:'harness-image',title:'Image',tone:'image-segment' },
  { ...commonInput, id:'harness-question',title:'Question',tone:'prompt-segment' },
  ...example.harness.steps.map((step,i)=>({ ...step,id:`crop-${i}`,title:`Inspect region ${i+1}`,detailTitle:step.title,tone:'inspection-segment' })),
  { id:'combine',title:'Combine evidence',tone:'reason-segment',summary:example.harness.summary,text:example.harness.text },
];

export function HarnessComparison() {
  const panelId = useId();
  const [selected, setSelected] = useState(null);
  const lastTrigger = useRef(null);
  function close() { setSelected(null);lastTrigger.current?.focus(); }
  function block(step,label,harness) {
    return <button key={step.id} type="button" className={`sequence-segment ${step.tone}`} title={`Show Luna example: ${step.title}`}
      aria-label={`${label}: ${step.title}. Show Luna example`} aria-expanded={selected?.id===step.id} aria-controls={panelId}
      onClick={e=>{lastTrigger.current=e.currentTarget;setSelected(selected?.id===step.id?null:{...step,harness});}}>
      {step.tone==='image-segment' && <ImageIcon size={17} aria-hidden="true" />}<span>{step.title}</span>
    </button>;
  }
  function lane(label, steps, harness) {
    const arm=harness?example.harness:example.null;
    return <section className="concept-lane" aria-label={label}>
      <h3>{label}</h3>
      <div className="sequence-row">
        <div className={`sequence-strip ${harness?'assisted-strip':'direct-strip'}`}>{steps.map(step=>block(step,label,harness))}</div>
        <ArrowRight size={22} className="sequence-output-arrow" aria-hidden="true" />
        {block({id:harness?'harness-answer':'null-answer',title:'Answer',tone:'answer-segment',summary:arm.summary,text:arm.text},label,harness)}
      </div>
    </section>;
  }
  return <figure className="composition-figure comparison-figure">
    <div className="illustration-scroll" tabIndex={0} role="group" aria-label="Horizontal comparison of model calls with and without a harness">
      <div className="concept-comparison">
        {lane('No harness',noHarness,false)}
        {lane('With a harness',withHarness,true)}
      </div>
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
