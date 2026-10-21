import examples from './qwen-examples.json';
import { Trace } from '../improving-vlms/traces';
import luna from './luna-example.json';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../improving-vlms/ui';

export function QwenExamples() {
  return <section className="article-examples trace-examples" aria-label="Qwen trajectory examples">
    <Tabs defaultValue={String(examples[0].idx)}>
      <TabsList className="trace-tabs" aria-label="Choose a Qwen example">{examples.map(example => <TabsTrigger key={example.idx} value={String(example.idx)}>{example.label}</TabsTrigger>)}</TabsList>
      {examples.map(example => <TabsContent key={example.idx} value={String(example.idx)}>
      <p className="panel-note">Qwen 3.6 27B, from the same harness evaluation as Figure 5.</p>
      <Trace example={example} compact toolDetailsToggle />
      </TabsContent>)}
    </Tabs>
  </section>;
}

export function LunaExample() {
  return <figure className="composition-figure luna-trace" id="figure-9">
    <div className="trace-examples luna-example-widget">
      <p className="panel-note">Same image and harness, five reasoning efforts. Tab counts show successes across all eight attempts.</p>
      <Trace example={luna} compact toolDetailsToggle />
    </div>
    <figcaption><span className="figure-number">Figure 9</span><span>One rollout per effort on the same visual-alignment question.</span></figcaption>
  </figure>;
}
