import examples from '../improving-vlms/trace-examples.json';
import { Trace } from '../improving-vlms/traces';
import { ImageView } from './diagrams';
import luna from './luna-example.json';

export function QwenExamples() {
  return <section className="article-examples" aria-label="Qwen trajectory examples">
    {examples.map(example => <details className="saved-example" key={example.idx}>
      <summary>{example.label}<span>{example.nullSuccesses}/8 → {example.harnessSuccesses}/8</span></summary>
      <p className="panel-note">{example.idx === 175
        ? 'Qwen 3.6 27B, execution-prompt harness. The trajectory introduced in Figure 2 is shown in full below.'
        : 'Qwen 3.6 27B, earlier full-Codex-prompt harness. This historical example is not part of the Figure 5 comparison.'}</p>
      <Trace example={example} />
    </details>)}
  </section>;
}

export function LunaExample() {
  return <figure className="composition-figure luna-trace">
    <details className="saved-example">
      <summary>Comparing window corners<span>0/8 → 6/8</span></summary>
      <p>{luna.question}</p>
      <ImageView src={luna.original_image} alt="Original chat-window screenshot" />
      <ul className="example-options">{Object.entries(luna.options).map(([letter, value]) => <li key={letter}><strong>{letter}</strong> {value}</li>)}</ul>
      <h3>No harness</h3><blockquote className="verbatim-reply answer-incorrect">{luna.null.text}</blockquote>
      <h3>With a harness</h3>
      <div className="luna-crops">{luna.harness.steps.map(step => <ImageView key={step.title} src={step.image} alt={step.title} />)}</div>
      <blockquote className="verbatim-reply answer-correct">{luna.harness.text}</blockquote>
    </details>
    <figcaption><span className="figure-number">Figure 9</span><span>Luna at high effort compares two saved crops before answering. Both crops were created together and viewed sequentially. The responses and crop outputs are verbatim; no intermediate reasoning text was returned. This example illustrates tool use, not learning across effort levels.</span></figcaption>
  </figure>;
}
