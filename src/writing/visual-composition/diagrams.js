import { useId, useRef, useState } from 'react';
import { ArrowRight, Maximize2, X, ChevronDown } from 'lucide-react';
import example from './luna-example.json';

function Caption({ number, children }) {
  return <figcaption><span className="figure-number">Figure {number}</span><span>{children}</span></figcaption>;
}

export function EncoderDiagram() {
  const marker = useId().replace(/:/g,'');
  return <figure className="composition-figure encoder-figure">
    <div className="illustration-scroll" tabIndex={0} role="group" aria-label="Horizontal vision-language model diagram">
      <svg className="encoder-illustration" width="720" height="236" viewBox="0 0 720 236" role="img" aria-labelledby={`${marker}-title ${marker}-desc`}>
        <title id={`${marker}-title`}>Image and question flow into a language model</title>
        <desc id={`${marker}-desc`}>Left to right: the image passes through a vision encoder and projector to become image tokens. The question becomes text tokens. Both token streams enter the language model, which produces an answer.</desc>
        <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="var(--diagram-wire)" /></marker></defs>
        <g fill="none" stroke="var(--diagram-wire)" strokeWidth="1" markerEnd={`url(#${marker})`}>
          <path d="M75 76 H105" /><path d="M207 76 H235" />
          <path d="M96 191 H326" /><path d="M425 76 C459 76 443 125 476 125" /><path d="M425 191 C459 191 443 143 476 143" /><path d="M604 134 H649" />
        </g>
        <image href={example.original_image} x="8" y="29" width="56" height="89" />
        <text x="36" y="146" className="stage-label">Image</text>
        <g className="encoder-layers" stroke="var(--diagram-sea)" strokeWidth="1">
          <path d="M128 30 L190 42 V118 L128 106 Z" fill="var(--diagram-sea-wash)" />
          <path d="M120 24 L182 36 V112 L120 100 Z" fill="var(--paper)" />
          <path d="M112 18 L174 30 V106 L112 94 Z" fill="var(--diagram-sea-wash)" />
          {[1,2,3].map(i=><path key={i} d={`M${112+i*15.5} ${18+i*3} v76 M112 ${18+i*19} l62 12`} opacity=".5" />)}
        </g>
        <text x="153" y="146" className="stage-label">Vision encoder</text>
        <g fill="none" stroke="var(--diagram-sea)" strokeWidth="1.1">
          {[0,1,2,3,4].map(i=><path key={i} d={`M247 ${42+i*17} C275 ${42+i*17} 283 ${58+i*9} 310 ${58+i*9}`} opacity={.35+i*.15} />)}
        </g>
        <text x="275" y="146" className="stage-label">Projector</text>
        <text x="375" y="30" className="token-label">Image tokens</text>
        {[0,1,2,3,4].map(i=><rect key={`image-${i}`} x={333+i*18} y="51" width="12" height="50" fill="var(--diagram-sea)" opacity={.45+i*.12} />)}
        <text x="46" y="196" className="stage-label">Question</text>
        <text x="375" y="163" className="token-label">Text tokens</text>
        {[0,1,2,3,4].map(i=><rect key={`text-${i}`} x={333+i*18} y="177" width="12" height="28" fill="var(--diagram-copper)" opacity={.45+i*.12} />)}
        <path d="M501 94 H489 V174 H501 M581 94 H593 V174 H581" fill="none" stroke="var(--diagram-wire)" strokeWidth="1" />
        <text x="541" y="125" className="language-label"><tspan x="541">Language</tspan><tspan x="541" dy="23">model</tspan></text>
        <text x="687" y="139" className="stage-label">Answer</text>
      </svg>
    </div>
    <Caption number={1}>Image and text inputs become token representations that the language model processes together.</Caption>
  </figure>;
}

function RegionIcon({ crop }) {
  return <svg className="region-icon" viewBox="-6 -6 327 512" aria-hidden="true">
    <image href={example.original_image} width="315" height="500" opacity={crop?'.16':'.55'} />
    <rect width="315" height="500" fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="8" />
    {crop && <rect className="crop-highlight" x={crop[0]} y={crop[1]} width={crop[2]-crop[0]} height={crop[3]-crop[1]} />}
  </svg>;
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

const commonInput = { image:example.original_image, input:true };
const noHarness = [
  { ...commonInput, id:'null-image',title:'Image',tone:'image-segment' },
  { ...commonInput, id:'null-question',title:'Question',tone:'prompt-segment' },
  { id:'null-reason',title:'Reasoning',tone:'reason-segment',reasoning:true },
];
const withHarness = [
  { ...commonInput, id:'harness-image',title:'Image',tone:'image-segment' },
  { ...commonInput, id:'harness-question',title:'Question',tone:'prompt-segment' },
  ...example.harness.steps.map((step,i)=>({ ...step,id:`crop-${i}`,title:i===0?'Inspect top':'Inspect bottom',detailTitle:step.title,tone:'inspection-segment' })),
  { id:'combine',title:'Combine evidence',tone:'reason-segment',reasoning:true },
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
      {(step.tone==='image-segment' || step.crop_box) && <RegionIcon crop={step.crop_box} />}<span>{step.title}</span>
    </button>;
  }
  function lane(label, steps, harness) {
    const arm=harness?example.harness:example.null;
    return <section className="concept-lane" aria-label={label}>
      <h3>{label}</h3>
      <div className="sequence-row">
        <div className={`sequence-strip ${harness?'assisted-strip':'direct-strip'}`}>{steps.map(step=>block(step,label,harness))}</div>
        <ArrowRight size={22} className="sequence-output-arrow" aria-hidden="true" />
        {block({id:harness?'harness-answer':'null-answer',title:'Answer',tone:'answer-segment',text:arm.text},label,harness)}
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
        <div className="example-heading"><div><strong>Luna example</strong><span>{selected.harness?'With a harness':'No harness'} · {example.effort} reasoning · {(selected.harness?example.harness:example.null).successes}/{(selected.harness?example.harness:example.null).total} correct</span></div>
          <button className="example-close" type="button" title="Close example" aria-label="Close example" onClick={close}><X size={18} /></button>
        </div>
        <div className={`example-content ${selected.input?'has-image':''}`}>
          {selected.input && <ImageView src={selected.image} alt="Original chat-window image" />}
          <div className="example-text">
            <h4>{selected.detailTitle || (selected.text?'Final reply':selected.title)}</h4>
            {selected.input && <><p>{example.question}</p><ul className="example-options">{Object.entries(example.options).map(([letter,value])=><li key={letter}><strong>{letter}</strong> {value}</li>)}</ul></>}
            {selected.reasoning && <p className="trace-availability">No intermediate reasoning text was saved for this trace.</p>}
            {selected.text && <><blockquote>{selected.text}</blockquote><span className="example-reference">Reference answer: {example.answer}</span></>}
            {selected.command && <>
              {selected.view_call && <details className="step-evidence"><summary><ChevronDown size={13} aria-hidden="true" />Create both crops · saved Python command</summary><pre><code>{selected.command}</code></pre><span className="example-reference">Tool output</span><pre><code>{example.harness.crop_output}</code></pre></details>}
              <pre className="trace-call"><code>{selected.view_call || selected.command}</code></pre>
              <ImageView src={selected.image} alt={selected.detailTitle} />
            </>}
          </div>
        </div>
        <p className="example-note">Verbatim replies, saved tool arguments, and returned images. Both crops were created in one call, then viewed separately. One selected rollout per condition; counts summarize eight attempts. Four model calls with the harness, one without; not compute-matched.</p>
      </>}
    </div>
  </figure>;
}
