import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ErrorBar, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../improving-vlms/ui';
import data from './chart-data.json';

const colors = ['var(--plot-blue)', 'var(--plot-coral)'];
const metricColors = ['var(--plot-blue)', 'var(--plot-green)'];
const percentage = n => `${Number(n).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const number = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const metricSeries = [{ key: 'pass1', label: 'Pass@1' }, { key: 'pass8', label: 'Pass@8' }];
const setups = [{ key: 'null', label: 'No harness' }, { key: 'codex', label: 'With harness' }];

function Legend({ series, palette = colors }) {
  return <ul className="chart-legend">{series.map((s, i) => <li key={s.key}><span className="legend-swatch" style={{ background: palette[i] }} aria-hidden="true" />{s.label}</li>)}</ul>;
}

function DataTable({ rows, x, series, label, format }) {
  return <details className="plot-data"><summary>View data</summary><div className="plot-table-scroll" tabIndex={0}>
    <table><caption>{label}</caption><thead><tr><th scope="col">{x.label}</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[x.key]}</th>{series.map(s => <td key={s.key}>{format(r[s.key])}</td>)}</tr>)}</tbody></table>
  </div></details>;
}

function Plot({ rows, x, series, label, format = percentage, domain = ['auto', 'auto'], bars = false, palette = colors, zero = false, intervals = false, valueLabels = false }) {
  const Canvas = bars ? BarChart : LineChart;
  const Mark = bars ? Bar : Line;
  const numeric = x.numeric;
  return <>
    <div className="y-axis-heading">{label}</div>
    <ChartContainer className="research-chart" aria-label={`${label} by ${x.label}`}>
      <Canvas data={rows} accessibilityLayer margin={{ top: 24, right: numeric ? 36 : 18, bottom: 8, left: 0 }} barGap={5}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey={x.key} type={numeric ? 'number' : 'category'} domain={numeric ? ['auto', 'auto'] : undefined} padding={numeric ? undefined : { left: bars ? 0 : 20, right: bars ? 0 : 20 }} interval={numeric ? undefined : 0} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tickMargin={10} height={36} tickFormatter={numeric ? number : undefined} />
        <YAxis domain={domain} width={52} tickLine={false} axisLine={false} tickFormatter={format} tickCount={5} />
        {zero && <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 4" />}
        <ChartTooltip content={<ChartTooltipContent className="chart-tooltip" labelFormatter={(v, p) => numeric ? `${p?.[0]?.payload.effort} effort · ${number(v)} output tokens` : v} formatter={(v, name) => <div className="tooltip-row"><span>{series.find(s => s.key === name)?.label}</span><strong>{format(v)}</strong></div>} />} />
        {series.map((s, i) => <Mark key={s.key} dataKey={s.key} type="linear" stroke={palette[i]} fill={palette[i]} strokeWidth={bars ? 0 : 2.5} dot={bars ? undefined : { r: 4, strokeWidth: 0 }} activeDot={bars ? undefined : { r: 6 }} maxBarSize={52} isAnimationActive={false}>
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
    <details className="supplemental-plot"><summary>View the harness gain</summary>
      <Legend series={metricSeries} palette={metricColors} />
      <Plot rows={data.efforts} x={{ key: 'effort', label: 'Reasoning effort' }} series={[{ key: 'delta1', label: 'Pass@1' }, { key: 'delta8', label: 'Pass@8' }]} label="Harness minus no harness (percentage points)" format={v => `${v > 0 ? '+' : ''}${number(v)}`} domain={[-4, 8]} palette={metricColors} zero />
    </details>
  </Figure>;
}

export function LunaRescuePlot() {
  const [effort, setEffort] = useState('high');
  const row = data.rescued.find(r => r.effort === effort);
  return <Figure n={7} caption={`Among ${row.total} questions with 0/8 successes without the harness at ${effort} effort, ${row.gained} are solved at least once with it. Separately, ${row.lost} previously solved questions fall to 0/8. The bars count successful attempts, not turns; the matched subset changes with effort.`}>
    <label className="effort-select">Reasoning effort <select value={effort} onChange={e => setEffort(e.target.value)}>{data.rescued.map(r => <option key={r.effort}>{r.effort}</option>)}</select></label>
    <Plot rows={row.values} x={{ key: 'successes', label: 'Successful harness attempts (out of 8)' }} series={[{ key: 'count', label: 'Questions originally at 0/8' }]} label="Problem count" domain={[0, 'auto']} format={number} bars valueLabels palette={['var(--plot-coral)']} />
  </Figure>;
}

export function LunaBehaviorPlot() {
  return <Figure n={8} caption="Each point is one Luna harness effort setting over 16,000 rollouts. Output tokens include reasoning and sum model calls and captured retries. Tool-use rate is the fraction of rollouts with at least one tool call; model calls are not a count of crops or tool calls. These are associations, not a controlled effect of token budget.">
    <div className="research-grid">{[{ key: 'toolRate', label: 'Rollouts using tools', format: percentage, domain: [0, 65] }, { key: 'modelCalls', label: 'Model calls per rollout', format: number, domain: [0, 4] }].map(s => <section className="chart-panel" key={s.key}>
      <h3>{s.label}</h3><Plot rows={data.behavior} x={{ key: 'output', label: 'Mean output tokens per rollout', numeric: true }} series={[s]} label={s.key === 'toolRate' ? 'Tool-use rate' : 'Average model calls'} domain={s.domain} format={s.format} />
    </section>)}</div>
  </Figure>;
}
