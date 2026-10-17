import { Bar, BarChart, CartesianGrid, ErrorBar, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '../improving-vlms/ui';
import data from './chart-data.json';
import { rescueConsistency } from './rescue-consistency';

const colors = ['var(--plot-blue)', 'var(--plot-coral)'];
const metricColors = ['var(--plot-blue)', 'var(--plot-green)'];
const percentage = n => `${Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const number = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const metricSeries = [{ key: 'pass1', label: 'Pass@1' }, { key: 'pass8', label: 'Pass@8' }];
const setups = [{ key: 'null', label: 'No harness' }, { key: 'codex', label: 'With harness' }];

function Legend({ series, palette = colors }) {
  return <ul className="chart-legend">{series.map((s, i) => <li key={s.key}><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true"><path d="M0 6 H26" stroke={palette[i]} strokeWidth="2" strokeDasharray={i % 2 ? '4 3' : undefined} />{i % 2 ? <rect x="10" y="3" width="6" height="6" fill={palette[i]} /> : <circle cx="13" cy="6" r="3" fill={palette[i]} />}</svg>{s.label}</li>)}</ul>;
}

function DataTable({ rows, x, series, label, format }) {
  return <table className="sr-only"><caption>{label} by {x.label}</caption><thead><tr><th scope="col">{x.label}</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[x.key]}</th>{series.map(s => <td key={s.key}>{format(r[s.key])}</td>)}</tr>)}</tbody></table>;
}

function Plot({ rows, x, series, label, format = percentage, domain = ['auto', 'auto'], bars = false, palette = colors, zero = false, intervals = false, valueLabels = false }) {
  const Canvas = bars ? BarChart : LineChart;
  const Mark = bars ? Bar : Line;
  const numeric = x.numeric;
  return <>
    <div className="y-axis-heading">{label}</div>
    <ChartContainer className="research-chart" aria-label={`${label} by ${x.label}`}>
      <Canvas data={rows} accessibilityLayer={false} margin={{ top: 24, right: numeric ? 36 : 18, bottom: 8, left: 0 }} barGap={5}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey={x.key} type={numeric ? 'number' : 'category'} domain={numeric ? ['auto', 'auto'] : undefined} padding={numeric ? undefined : { left: bars ? 0 : 20, right: bars ? 0 : 20 }} interval={numeric ? undefined : 0} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tickMargin={10} height={36} tickFormatter={numeric ? number : undefined} />
        <YAxis domain={domain} width={52} tickLine={false} axisLine={false} tickFormatter={format === percentage ? v => `${v}%` : format} tickCount={5} />
        {zero && <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 4" />}
        {series.map((s, i) => <Mark key={s.key} dataKey={s.key} type="linear" stroke={palette[i]} fill={palette[i]} strokeWidth={bars ? 0 : 2.5} strokeDasharray={!bars && i % 2 ? '5 4' : undefined} dot={bars ? undefined : i % 2 ? ({ cx, cy }) => <rect x={cx - 3.5} y={cy - 3.5} width={7} height={7} fill={palette[i]} /> : { r: 4, strokeWidth: 0 }} activeDot={false} activeBar={false} maxBarSize={52} isAnimationActive={false}>
          {intervals && rows.every(r => r[s.key + 'Error']) && <ErrorBar dataKey={s.key + 'Error'} direction="y" width={4} stroke={palette[i]} strokeWidth={1.2} />}
          {valueLabels && <LabelList dataKey={s.key} position="top" offset={9} formatter={format} fill={palette[i]} fontSize={12} />}
          {numeric && <LabelList dataKey="effort" content={({ x: px, y: py, value }) => <text x={px} y={Number(py) + (value === 'low' ? 20 : -13)} textAnchor="middle" fill={palette[i]} fontSize={12}>{value}</text>} />}
        </Mark>)}
      </Canvas>
    </ChartContainer>
    <div className="x-axis-heading">{x.label}</div>
    <DataTable rows={rows} x={x} series={series} label={label} format={format} />
  </>;
}

function Figure({ n, caption, children }) {
  return <figure className="composition-figure research-figure" id={`figure-${n}`}>
    {children}<figcaption><span className="figure-number">Figure {n}</span><span>{caption}</span></figcaption>
  </figure>;
}

export function ScalingPlot() {
  return <Figure n={3} caption="One-turn Qwen results on 2,000 matched questions, with eight attempts per question. Bars show 95% question-bootstrap intervals. 27B is Qwen 3.6; the other models are Qwen 3.5. 397B has 17B active parameters. This is not a controlled parameter-count experiment.">
    <Legend series={metricSeries} palette={metricColors} />
    <Plot rows={data.overall} x={{ key: 'model', label: 'Model size' }} series={metricSeries} label="Pass rate" domain={[40, 90]} palette={metricColors} intervals />
  </Figure>;
}

export function CategoryPlot() {
  return <Figure n={4} caption="Pass@1 and Pass@8 by assigned primary skill category. Each panel uses the same vertical scale. Categories are model-assisted annotations, not causal diagnoses.">
    <Legend series={metricSeries} palette={metricColors} />
    <div className="research-grid">{data.categories.map(c => <section className="chart-panel" key={c.id}>
      <h3>{c.label}</h3><p className="panel-note">{c.problems} questions</p>
      <Plot rows={c.values} x={{ key: 'model', label: 'Model size' }} series={metricSeries} label="Pass rate" domain={[35, 90]} palette={metricColors} />
    </section>)}</div>
  </Figure>;
}

export function QwenHarnessPlot() {
  return <Figure n={5} caption="Matched one-turn and execution-prompt Codex-based harness evaluations, with 2,000 questions and eight attempts per question for each model. Histograms show repeated success; gained and lost counts are observed transitions to and from 0/8, not proof of an absolute capability boundary.">
    <Legend series={setups} />
    <div className="research-grid">{data.qwen.map(q => <section className="chart-panel" key={q.model}>
      <h3>Qwen {q.model === '27B' ? '3.6 27B' : '3.5 397B'}</h3>
      <Plot rows={q.metrics} x={{ key: 'metric', label: 'Evaluation metric' }} series={setups} label="Pass rate" domain={[0, 100]} bars valueLabels />
      <Plot rows={q.histogram} x={{ key: 'successes', label: 'Successful attempts (out of 8)' }} series={setups} label="Problem count" domain={[0, 850]} format={number} bars />
      <p className="transition-counts"><strong>{q.gained}</strong> gained · <strong>{q.lost}</strong> lost · <strong>+{q.gained - q.lost}</strong> net questions solved</p>
    </section>)}</div>
  </Figure>;
}

export function LunaEffortPlot() {
  return <Figure n={6} caption="Luna with and without the harness across five reasoning efforts, on the same 2,000 questions with eight attempts each. Bars show 95% question-bootstrap intervals. The harness improves both metrics at medium effort and above; low effort is an exception to the gain.">
    <Legend series={setups} />
    <div className="research-grid">{[1, 8].map(k => <section className="chart-panel" key={k}>
      <h3>Pass@{k}</h3><Plot rows={data.efforts} x={{ key: 'effort', label: 'Reasoning effort' }} series={[{ key: `nullPass${k}`, label: 'No harness' }, { key: `codexPass${k}`, label: 'With harness' }]} label="Pass rate" domain={k === 1 ? [40, 70] : [60, 90]} intervals />
    </section>)}</div>
    <section className="supplemental-plot" aria-label="Harness gain">
      <Legend series={metricSeries} palette={metricColors} />
      <Plot rows={data.efforts} x={{ key: 'effort', label: 'Reasoning effort' }} series={[{ key: 'delta1', label: 'Pass@1' }, { key: 'delta8', label: 'Pass@8' }]} label="Harness minus no harness (percentage points)" format={v => `${v > 0 ? '+' : ''}${number(v)}`} domain={[-4, 8]} palette={metricColors} zero />
    </section>
  </Figure>;
}

const effortStyles = [
  { color: 'var(--muted)', dash: '2 4', shape: 'circle' },
  { color: 'var(--plot-gold)', dash: '7 4', shape: 'triangle' },
  { color: 'var(--plot-green)', dash: '9 3 2 3', shape: 'square' },
  { color: 'var(--plot-coral)', dash: '5 3', shape: 'diamond' },
  { color: 'var(--plot-blue)', shape: 'cross' },
];

function EffortMark({ cx, cy, style }) {
  const size = 3.5;
  if (style.shape === 'square') return <rect x={cx-size} y={cy-size} width={size*2} height={size*2} fill={style.color} />;
  if (style.shape === 'triangle') return <path d={`M${cx} ${cy-4} l4 7 h-8 Z`} fill={style.color} />;
  if (style.shape === 'diamond') return <path d={`M${cx} ${cy-4} l4 4 -4 4 -4 -4 Z`} fill={style.color} />;
  if (style.shape === 'cross') return <path d={`M${cx-4} ${cy} h8 M${cx} ${cy-4} v8`} stroke={style.color} strokeWidth="2" />;
  return <circle cx={cx} cy={cy} r={size} fill={style.color} />;
}

export function LunaRescuePlot() {
  const rows = rescueConsistency(data.rescued);
  return <Figure n={7} caption="Among questions answered incorrectly in all eight no-harness attempts, each curve shows the share reaching at least the indicated number of harness successes. Zero-success cases stay in the denominator. These are observed eight-attempt outcomes, not estimated future success probabilities; gains and losses can also reflect finite sampling.">
    <p className="cohort-note">Each effort uses its own baseline 0/8 question set, not the same cases across efforts.</p>
    <ul className="chart-legend rescue-legend">{data.rescued.map((r, i) => <li key={r.effort}>
      <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true"><path d="M0 7 H32" stroke={effortStyles[i].color} strokeWidth="2" strokeDasharray={effortStyles[i].dash} /><EffortMark cx={16} cy={7} style={effortStyles[i]} /></svg>
      <span>{r.effort}<span className="cohort-size">n = {r.total}</span></span>
    </li>)}</ul>
    <div className="y-axis-heading">Share of baseline 0/8 questions meeting threshold</div>
    <ChartContainer className="research-chart rescue-chart" aria-label="Luna rescue consistency across five reasoning efforts">
      <LineChart data={rows} accessibilityLayer={false} margin={{ top: 16, right: 18, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="threshold" interval={0} padding={{ left: 20, right: 20 }} tickLine={false} tickMargin={10} axisLine={{ stroke: 'var(--line)' }} />
        <YAxis domain={[0, 50]} ticks={[0,10,20,30,40,50]} tickFormatter={v => `${v}%`} width={52} axisLine={false} tickLine={false} />
        {data.rescued.map((r, i) => <Line key={r.effort} dataKey={r.effort} type="linear" stroke={effortStyles[i].color} strokeDasharray={effortStyles[i].dash} strokeWidth={2.2} activeDot={false} isAnimationActive={false} dot={props => <EffortMark cx={props.cx} cy={props.cy} style={effortStyles[i]} />} />)}
      </LineChart>
    </ChartContainer>
    <div className="x-axis-heading">Minimum successful harness attempts (out of 8)</div>
    <div className="threshold-guide"><span>1: solved at least once</span><span>8: solved every time</span></div>
    <div className="rescue-table-wrap"><table className="rescue-summary"><caption className="sr-only">Luna rescue outcomes by effort</caption>
      <thead><tr><th scope="col">Effort</th><th scope="col">Still 0/8</th><th scope="col">At least 1/8</th><th scope="col">All 8/8</th></tr></thead>
      <tbody>{data.rescued.map(r => <tr key={r.effort}><th scope="row">{r.effort}</th><td>{percentage(r.values[0].count/r.total*100)}</td><td>{percentage(r.gained/r.total*100)}</td><td>{percentage(r.values[8].count/r.total*100)}</td></tr>)}</tbody>
    </table></div>
    <DataTable rows={rows} x={{ key: 'threshold', label: 'Minimum successful harness attempts' }} series={data.rescued.map(r => ({ key: r.effort, label: `${r.effort} (n=${r.total})` }))} label="Share of baseline 0/8 questions" format={percentage} />
  </Figure>;
}

export function LunaBehaviorPlot() {
  return <Figure n={8} caption="Each point is one Luna harness effort setting over 16,000 rollouts. Output tokens include reasoning and sum model calls and captured retries. Tool-use rate is the fraction of rollouts with at least one tool call; model calls are not a count of crops or tool calls. These are associations, not a controlled effect of token budget.">
    <div className="research-grid">{[{ key: 'toolRate', label: 'Rollouts using tools', format: percentage, domain: [0, 65] }, { key: 'modelCalls', label: 'Model calls per rollout', format: number, domain: [0, 4] }].map(s => <section className="chart-panel" key={s.key}>
      <h3>{s.label}</h3><Plot rows={data.behavior} x={{ key: 'output', label: 'Mean output tokens per rollout', numeric: true }} series={[s]} label={s.key === 'toolRate' ? 'Tool-use rate' : 'Average model calls'} domain={s.domain} format={s.format} />
    </section>)}</div>
  </Figure>;
}
