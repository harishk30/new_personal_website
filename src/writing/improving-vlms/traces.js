'use client';
import Markdown from 'react-markdown';
import { ChevronDown, Maximize2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from './ui';
import { commandText, reasoningMarkdown, terminalText } from './trace-format';
import traces from './trace-examples.json';
function Fold({ label, children }) {
    return <Collapsible className="trace-fold">
    <CollapsibleTrigger className="trace-fold-trigger"><ChevronDown size={14} aria-hidden="true"/>{label}</CollapsibleTrigger>
    <CollapsibleContent className="trace-fold-content">{children}</CollapsibleContent>
  </Collapsible>;
}
function TraceText({ text }) {
    return <div className="trace-prose"><Markdown components={{ img: () => null }}>{reasoningMarkdown(text)}</Markdown></div>;
}
function TraceImage({ picture }) {
    return <figure className={`trace-image ${picture.reconstructed ? 'crop-image' : 'input-image'}`}>
    <Dialog>
      <DialogTrigger className="trace-image-trigger" aria-label={`Enlarge ${picture.label}`} title={picture.reconstructed ? 'Reconstructed from the recorded crop command' : undefined}>
        <img src={picture.src} alt={picture.label} width={picture.width} height={picture.height} loading="lazy"/>
        <Maximize2 className="trace-enlarge" size={16} aria-hidden="true"/>
      </DialogTrigger>
      <DialogContent className="figure-dialog trace-image-dialog" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{picture.label}</DialogTitle>
        <div className="figure-scroll"><img src={picture.src} width={picture.width} height={picture.height} alt={picture.label}/></div>
      </DialogContent>
    </Dialog>
  </figure>;
}
function Trajectory({ events, correct, compact = false, showTools = false }) {
    const groups = [];
    for (const event of events) {
        if (event.role === 'user')
            continue;
        if (event.role === 'tool' && groups.length)
            groups[groups.length - 1].results.push(event);
        else
            groups.push({ event, results: [] });
    }
    return <ol className="trace-timeline">{groups.map(({ event, results }) => {
            const final = event.role === 'assistant' && event.calls.length === 0 && /Answer:\s*[A-D]/.test(event.text);
            const images = results.flatMap(r => r.images);
            const label = `Turn ${event.turn}${final ? ' · Answer' : ''}`;
            return <li key={event.node} className="trace-step">
      <div className="trace-step-label">{label}{final && <span className={`trace-verdict ${correct ? 'correct' : 'incorrect'}`}>{correct ? 'Correct' : 'Incorrect'}</span>}</div>
      <div className="trace-step-content">
      {event.reasoning && (compact && event.reasoning.length < 600 ? <TraceText text={event.reasoning}/> : <Fold label="Reasoning"><TraceText text={event.reasoning}/></Fold>)}
      {event.text && <TraceText text={event.text}/>}
      {(!compact || showTools) && event.calls.map((call, i) => {
        const text = typeof call.arguments.cmd === 'string' ? commandText(call.arguments.cmd) : JSON.stringify(call.arguments, null, 2);
        const code = <pre className="trace-code">{text}</pre>;
        const label = call.name === 'exec_command' ? 'Python / terminal' : 'View image';
        return compact && text.length < 600 ? <div key={i}><div className="trace-tool-label">{label}</div>{code}</div> : <Fold key={i} label={label}>{code}</Fold>;
      })}
      {(!compact || showTools) && results.filter(r => r.text).map(result => {
        const text = terminalText(result.text);
        if (!text.trim()) return null;
        const output = <pre className="trace-code">{text}</pre>;
        return compact && text.length < 600 ? <div key={result.node}><div className="trace-tool-label">Tool output</div>{output}</div> : <Fold key={result.node} label="Output">{output}</Fold>;
      })}
      {images.length > 0 && <div className={`trace-crops ${images.length > 1 ? 'multiple' : ''}`}>{images.map(p => <TraceImage key={p.src} picture={p}/>)}</div>}
      </div>
    </li>;
        })}</ol>;
}
export function Trace({ example, compact = false }) {
    const variants = example.variants || [
        { key: 'without', label: 'Without harness', successes: example.nullSuccesses, events: example.withoutHarness.events, correct: false },
        { key: 'with', label: 'With harness', successes: example.harnessSuccesses, events: example.events, correct: true },
    ];
    const defaultVariant = variants.some(v => v.key === example.defaultVariant) ? example.defaultVariant : example.variants ? variants[0].key : 'with';
    return <>
    <h3 className="trace-question">{example.question}</h3>
    <TraceImage picture={example.input}/>
    <ul className="trace-options">{Object.entries(example.options).map(([key, value]) => <li key={key}><strong>{key}.</strong> {value}</li>)}</ul>
    <div className="trace-reference">Correct answer: {example.answer} · {example.options[example.answer]}</div>
    <Tabs defaultValue={defaultVariant} className="trace-comparison">
      <TabsList variant="line" className="trace-mode-tabs" aria-label={example.variants ? 'Compare reasoning efforts' : 'Compare harness responses'}>
        {variants.map(v => <TabsTrigger key={v.key} value={v.key}>{v.label} <span>{v.successes}/8</span></TabsTrigger>)}
      </TabsList>
      {variants.map(v => <TabsContent key={v.key} value={v.key}><Trajectory events={v.events} correct={v.correct} compact={compact} showTools={v.showTools}/></TabsContent>)}
    </Tabs>
  </>;
}
export function TraceExamples() {
    return <section className="trace-examples" aria-label="Tool-use trajectory examples">
    <Tabs defaultValue="175">
      <TabsList variant="line" className="trace-tabs" aria-label="Choose a trajectory">
        {traces.map(t => <TabsTrigger key={t.idx} value={String(t.idx)}>{t.label}</TabsTrigger>)}
      </TabsList>
      {traces.map(example => <TabsContent key={example.idx} value={String(example.idx)}><Trace example={example}/></TabsContent>)}
    </Tabs>
  </section>;
}
