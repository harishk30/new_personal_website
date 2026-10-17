import examples from '../improving-vlms/trace-examples.json';
import { Trace } from '../improving-vlms/traces';
import { ImageView } from './diagrams';
import luna from './luna-example.json';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../improving-vlms/ui';

export function QwenExamples() {
  return <section className="article-examples trace-examples" aria-label="Qwen trajectory examples">
    <Tabs defaultValue="175">
      <TabsList className="trace-tabs" aria-label="Choose a Qwen example">{examples.map(example => <TabsTrigger key={example.idx} value={String(example.idx)}>{example.label}</TabsTrigger>)}</TabsList>
      {examples.map(example => <TabsContent key={example.idx} value={String(example.idx)}>
      <p className="panel-note">{example.idx === 175
        ? 'Qwen 3.6 27B, execution-prompt harness. The trajectory introduced in Figure 2 is shown below.'
        : 'Qwen 3.6 27B, earlier full-Codex-prompt harness. This historical example is not part of the Figure 5 comparison.'}</p>
      <Trace example={example} compact />
      </TabsContent>)}
    </Tabs>
  </section>;
}

export function LunaExample() {
  return <figure className="composition-figure luna-trace">
    <div className="luna-example-widget">
      <p>{luna.question}</p>
      <ImageView src={luna.original_image} alt="Original chat-window screenshot" />
      <ul className="example-options">{Object.entries(luna.options).map(([letter, value]) => <li key={letter}><strong>{letter}</strong> {value}</li>)}</ul>
      <Tabs defaultValue="with" className="trace-comparison">
        <TabsList className="trace-mode-tabs" aria-label="Compare Luna responses">
          <TabsTrigger value="without">Without harness <span>0/8</span></TabsTrigger>
          <TabsTrigger value="with">With harness <span>6/8</span></TabsTrigger>
        </TabsList>
        <TabsContent value="without"><div className="answer-status">Incorrect</div><blockquote className="verbatim-reply answer-incorrect">{luna.null.text}</blockquote></TabsContent>
        <TabsContent value="with">
          <div className="luna-crops">{luna.harness.steps.map(step => <ImageView key={step.title} src={step.image} alt={step.title} />)}</div>
          <div className="answer-status">Correct</div><blockquote className="verbatim-reply answer-correct">{luna.harness.text}</blockquote>
        </TabsContent>
      </Tabs>
    </div>
    <figcaption><span className="figure-number">Figure 9</span><span>Luna at high effort compares two saved crops before answering. Both crops were created together and viewed sequentially. The responses and crop outputs are verbatim; no intermediate reasoning text was returned. This example illustrates tool use, not learning across effort levels.</span></figcaption>
  </figure>;
}
