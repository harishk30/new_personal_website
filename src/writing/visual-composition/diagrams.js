import { useId, useRef, useState } from 'react';
import { ArrowRight, Maximize2, X } from 'lucide-react';
import Markdown from 'react-markdown';
import traces from '../improving-vlms/trace-examples.json';
import { reasoningMarkdown } from '../improving-vlms/trace-format';

const example = traces.find(trace => trace.idx === 175);

function Caption({ number, children }) {
  return <figcaption><span className="figure-number">Figure {number}</span><span>{children}</span></figcaption>;
}

export function EncoderDiagram() {
  const marker = useId().replace(/:/g,'');
  return <figure className="composition-figure encoder-figure">
    <div className="illustration-scroll" tabIndex={0} role="group" aria-label="Horizontal vision-language model diagram">
      <svg className="encoder-illustration" width="720" height="236" viewBox="0 0 720 236" role="img" aria-labelledby={`${marker}-title ${marker}-desc`}>
        <title id={`${marker}-title`}>Image and question flow into a language model</title>
        <desc id={`${marker}-desc`}>Left to right: the image passes through a vision encoder and projector to become image tokens. The question becomes text tokens. Image tokens are stacked above text tokens in one vertical column before the language model, which produces an answer.</desc>
        <defs><marker id={marker} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6" fill="var(--diagram-wire)" /></marker></defs>
        <g fill="none" stroke="var(--diagram-wire)" strokeWidth="1" markerEnd={`url(#${marker})`}>
          <path d="M75 76 H105" /><path d="M207 76 H235" />
          <path d="M322 76 H342" /><path d="M96 191 H267 C301 191 305 145 342 145" /><path d="M427 112 H476" /><path d="M604 112 H649" />
        </g>
        <image href={example.input.src} x="0" y="56" width="72" height="40" />
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
        <text x="382" y="35" className="token-label">Image tokens</text>
        <g className="image-token-stack">{[0,1,2,3,4].map(i=><rect key={`image-${i}`} x="357" y={52+i*11} width="50" height="8" rx="2" fill="var(--diagram-sea)" />)}</g>
        <text x="46" y="196" className="stage-label">Question</text>
        <text x="382" y="195" className="token-label">Text tokens</text>
        <g className="text-token-stack">{[0,1,2,3,4].map(i=><rect key={`text-${i}`} x="357" y={117+i*11} width="50" height="8" rx="2" fill="var(--diagram-copper)" />)}</g>
        <path d="M419 51 Q425 51 425 57 V163 Q425 170 419 170" fill="none" stroke="var(--diagram-wire)" />
        <path d="M501 72 H489 V152 H501 M581 72 H593 V152 H581" fill="none" stroke="var(--diagram-wire)" strokeWidth="1" />
        <text x="541" y="106.5" className="language-label"><tspan x="541">Language</tspan><tspan x="541" dy="23">model</tspan></text>
        <text x="687" y="117" className="stage-label">Answer</text>
      </svg>
    </div>
    <Caption number={1}>Image and text inputs become token representations that the language model processes together.</Caption>
  </figure>;
}

function RegionIcon({ crop }) {
  const { width, height, src } = example.input;
  return <svg className="region-icon" viewBox={`-6 -6 ${width+12} ${height+12}`} aria-hidden="true">
    <image href={src} width={width} height={height} opacity={crop?'.16':'.55'} />
    <rect width={width} height={height} fill="none" stroke="currentColor" strokeOpacity=".4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    {crop && <rect className="crop-highlight" x={crop[0]} y={crop[1]} width={crop[2]-crop[0]} height={crop[3]-crop[1]} />}
  </svg>;
}

function ImageView({ src, alt, reconstructed = false }) {
  const dialog = useRef(null);
  return <div className="composition-image">
    <button className="image-open" type="button" title={reconstructed?'Enlarge crop reconstructed from the recorded command':'Enlarge image'} aria-label={`Enlarge: ${alt}${reconstructed?' (reconstructed from the recorded crop command)':''}`} onClick={() => dialog.current.showModal()}>
      <img src={src} alt={alt} loading="lazy" /><Maximize2 size={15} className="image-open-icon" aria-hidden="true" />
    </button>
    <dialog ref={dialog} className="composition-image-dialog" aria-label={alt} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <button className="image-close" type="button" title="Close image" aria-label="Close image" onClick={() => dialog.current.close()}><X size={21} /></button>
      <img src={src} alt={alt} />
    </dialog>
  </div>;
}

function TraceText({ children }) {
  return <div className="saved-model-text"><Markdown components={{ img: () => null }}>{reasoningMarkdown(children)}</Markdown></div>;
}

function sequence(events, prefix) {
  let reasoningCount = 0;
  const steps = [
    { id:`${prefix}-image`,title:'Image',detail:'Original image and question',tone:'image-segment',input:true },
  ];
  events.forEach(event=>{
    if(event.role==='assistant' && event.reasoning) {
      // Group consecutive prose until the next viewed image, without summarizing it.
      let step=steps.at(-1);
      if(step.tone!=='reason-segment') {
        step={id:`${prefix}-${event.node}-reason`,title:'Reasoning',detail:`Reasoning ${++reasoningCount}`,tone:'reason-segment',passages:[]};
        steps.push(step);
      }
      step.passages.push(event.reasoning);
      if(event.calls.length && event.text) step.passages.push(event.text);
    }
    event.images.forEach((picture,i)=>{
      steps.push({ id:`${prefix}-${event.node}-image-${i}`,title:picture.label.replace(' pipe',''),
        detail:`Inspect ${picture.label.toLowerCase()}`,
        tone:'inspection-segment',crop_box:picture.box,picture });
    });
  });
  return steps;
}
const noHarness = sequence(example.withoutHarness.events,'null');
const withHarness = sequence(example.events,'harness');

export function HarnessComparison() {
  const panelId = useId();
  const [selected, setSelected] = useState(null);
  const lastTrigger = useRef(null);
  function close() { setSelected(null);lastTrigger.current?.focus(); }
  function block(step,label,harness) {
    return <button key={step.id} type="button" className={`sequence-segment ${step.tone}`} title={`Show Qwen 3.6 27B example: ${step.detail || step.title}`}
      aria-label={`${label}: ${step.detail || step.title}${step.verdict?`. ${step.verdict}`:''}. Show Qwen example`} aria-expanded={selected?.id===step.id} aria-controls={panelId}
      onClick={e=>{lastTrigger.current=e.currentTarget;setSelected(selected?.id===step.id?null:{...step,harness});}}>
      {(step.tone==='image-segment' || step.crop_box) && <RegionIcon crop={step.crop_box} />}
      <span>{step.title}</span>
      {step.verdict && <span className="answer-verdict">{step.verdict}</span>}
    </button>;
  }
  function lane(label, steps, harness) {
    const events=harness?example.events:example.withoutHarness.events;
    const reply=events.filter(event=>event.role==='assistant' && !event.calls.length && event.text).at(-1);
    const correct=reply.text.match(/Answer:\s*([A-D])/i)?.[1]===example.answer;
    return <section className="concept-lane" aria-label={label}>
      <h3>{label}</h3>
      <div className="sequence-row">
        <div className="sequence-strip" style={{gridTemplateColumns:steps.map(step=>step.tone==='reason-segment'?'minmax(108px,1fr)':step.input?'88px':'64px').join(' ')}}>{steps.map(step=>block(step,label,harness))}</div>
        <ArrowRight size={22} className="sequence-output-arrow" aria-hidden="true" />
        {block({id:harness?'harness-answer':'null-answer',title:'Answer',tone:`answer-segment ${correct?'answer-correct':'answer-incorrect'}`,verdict:correct?'Correct':'Incorrect',text:reply.text},label,harness)}
      </div>
    </section>;
  }
  return <figure className="composition-figure comparison-figure" onKeyDown={e=>{if(e.key==='Escape' && selected && !e.target.closest('dialog')){e.stopPropagation();close();}}}>
    <div className="illustration-scroll" tabIndex={0} role="group" aria-label="Horizontal comparison of model calls with and without a harness">
      <div className="concept-comparison">
        {lane('No harness',noHarness,false)}
        {lane('With a harness',withHarness,true)}
      </div>
    </div>
    <Caption number={2}>A harness can turn a single global question into a sequence of local inspections, then combine their evidence into an answer. (Click a segment to view the trajectory.)</Caption>
    <div id={panelId} hidden={!selected} className="example-disclosure" role="region" aria-label="Qwen 3.6 27B example">
      {selected && <>
        <div className="example-heading">
          <button className="example-close" type="button" title="Close example" aria-label="Close example" onClick={close}><X size={18} /></button>
        </div>
        <div className={`example-content ${selected.input?'has-image':''}`}>
          {selected.input && <ImageView src={example.input.src} alt="Original image of a person operating a pipe valve" />}
          <div className="example-text">
            {selected.input && <><p>{example.question}</p><ul className="example-options">{Object.entries(example.options).map(([letter,value])=><li key={letter}><strong>{letter}</strong> {value}</li>)}</ul></>}
            {selected.text && <TraceText>{selected.text}</TraceText>}
            {selected.passages && <div key={selected.id} className="reasoning-scroll" tabIndex={0} role="region" aria-label={selected.detail}>
              {selected.passages.map((text,i)=><TraceText key={i}>{text}</TraceText>)}
            </div>}
            {selected.picture && <ImageView src={selected.picture.src} alt={selected.picture.label} reconstructed={selected.picture.reconstructed} />}
          </div>
        </div>
      </>}
    </div>
  </figure>;
}
