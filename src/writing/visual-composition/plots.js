import { Bar, BarChart, CartesianGrid, ErrorBar, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../improving-vlms/ui';
import data from './chart-data.json';
import { rescueConsistency } from './rescue-consistency';

const colors = ['var(--plot-blue)', 'var(--plot-coral)'];
const metricColors = ['var(--plot-blue)', 'var(--plot-green)'];
const percentage = n => `${Number(Number(n).toFixed(8)).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const number = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
const metricSeries = [{ key: 'pass1', label: 'Pass@1' }, { key: 'pass8', label: 'Pass@8' }];
const setups = [{ key: 'null', label: 'No harness' }, { key: 'codex', label: 'With harness' }];

function Legend({ series, palette = colors, bars = false }) {
  return <ul className="chart-legend">{series.map((s, i) => <li key={s.key}><svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">{bars ? <rect x="4" y="1" width="18" height="10" fill={palette[i]} /> : <><path d="M0 6 H26" stroke={palette[i]} strokeWidth="2" strokeDasharray={i % 2 ? '4 3' : undefined} />{i % 2 ? <rect x="10" y="3" width="6" height="6" fill={palette[i]} /> : <circle cx="13" cy="6" r="3" fill={palette[i]} />}</>}</svg>{s.label}</li>)}</ul>;
}

function DataTable({ rows, x, series, label, format, intervals = false }) {
  return <table className="sr-only"><caption>{label} by {x.label}</caption><thead><tr><th scope="col">{x.label}</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}><th scope="row">{r[x.key]}</th>{series.map(s => <td key={s.key}>{format(r[s.key])}{intervals && r[s.key + 'Error'] && ` (95% interval: ${format(r[s.key] - r[s.key + 'Error'][0])} to ${format(r[s.key] + r[s.key + 'Error'][1])})`}</td>)}</tr>)}</tbody></table>;
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
    <DataTable rows={rows} x={x} series={series} label={label} format={format} intervals={intervals} />
  </>;
}

function Figure({ n, caption, children }) {
  return <figure className="composition-figure research-figure" id={`figure-${n}`}>
    {children}<figcaption><span className="figure-number">Figure {n}</span><span>{caption}</span></figcaption>
  </figure>;
}

export function ScalingPlot() {
  return <Figure n={3} caption="One-turn Qwen results on 2,000 matched questions, with eight attempts per question. Bars show 95% question-bootstrap intervals. 27B is Qwen 3.6; the other models are Qwen 3.5. 397B has 17B active parameters.">
    <Legend series={metricSeries} palette={metricColors} />
    <Plot rows={data.overall} x={{ key: 'model', label: 'Model size' }} series={metricSeries} label="Pass rate" domain={[40, 90]} palette={metricColors} intervals />
  </Figure>;
}

export function CategoryPlot() {
  return <Figure n={4} caption="Pass@1 and Pass@8 by assigned primary skill category. Error bars show 95% question-bootstrap intervals within each category.">
    <Legend series={metricSeries} palette={metricColors} />
    <div className="research-grid">{data.categories.map(c => <section className="chart-panel" key={c.id}>
      <h3>{c.label}</h3><p className="panel-note">{c.problems} questions</p>
      <Plot rows={c.values} x={{ key: 'model', label: 'Model size' }} series={metricSeries} label="Pass rate" domain={[35, 90]} palette={metricColors} intervals />
    </section>)}</div>
  </Figure>;
}

export function QwenHarnessPlot() {
  return <Figure n={5} caption="Matched one-turn and execution-prompt Codex-based harness evaluations, with 2,000 questions and eight attempts per question for each model.">
    <Legend series={setups} bars />
    <div className="research-grid">{data.qwen.map(q => <section className="chart-panel" key={q.model}>
      <h3>Qwen {q.model === '27B' ? '3.6 27B' : '3.5 397B'}</h3>
      <Plot rows={q.metrics} x={{ key: 'metric', label: 'Evaluation metric' }} series={setups} label="Pass rate" domain={[0, 100]} bars valueLabels />
      <Plot rows={q.histogram} x={{ key: 'successes', label: 'Successful attempts (out of 8)' }} series={setups} label="Problem count" domain={[0, 850]} format={number} bars />
      <p className="transition-counts"><strong>{q.gained}</strong> gained · <strong>{q.lost}</strong> lost · <strong>+{q.gained - q.lost}</strong> net questions solved</p>
    </section>)}</div>
  </Figure>;
}

export function LunaEffortPlot() {
  return <Figure n={6} caption="Luna with and without the harness across five reasoning efforts, on the same 2,000 questions with eight attempts each. Error bars show 95% question-bootstrap intervals.">
    <Legend series={setups} />
    <div className="research-grid">{[1, 8].map(k => <section className="chart-panel" key={k}>
      <h3>Pass@{k}</h3><Plot rows={data.efforts} x={{ key: 'effort', label: 'Reasoning effort' }} series={[{ key: `nullPass${k}`, label: 'No harness' }, { key: `codexPass${k}`, label: 'With harness' }]} label="Pass rate" domain={k === 1 ? [40, 70] : [60, 90]} intervals />
    </section>)}</div>
    <section className="supplemental-plot" aria-label="Harness gain">
      <Legend series={metricSeries} palette={metricColors} />
      <Plot rows={data.efforts} x={{ key: 'effort', label: 'Reasoning effort' }} series={[{ key: 'delta1', label: 'Pass@1' }, { key: 'delta8', label: 'Pass@8' }]} label="Harness minus no harness (percentage points)" format={v => `${v > 0 ? '+' : ''}${number(v)}`} domain={[-6, 10]} palette={metricColors} zero intervals />
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

function RescueTick({ x, y, payload }) {
  const all = Number(payload.value) === 8;
  return <g transform={`translate(${x},${y})`} fill="var(--muted)" textAnchor="middle" fontSize={11}>
    <text className="rescue-tick-wide"><tspan x="0" dy="10">{all ? 'All 8' : `At least ${payload.value}`}</tspan></text>
    <text className="rescue-tick-narrow"><tspan x="0" dy="10">{all ? 'All' : 'At'}</tspan>{!all && <tspan x="0" dy="13">least</tspan>}<tspan x="0" dy="13">{payload.value}</tspan></text>
  </g>;
}

export function LunaRescuePlot() {
  const rows = rescueConsistency(data.rescued);
  return <Figure n={7} caption="Among questions answered incorrectly in all eight no-harness attempts, each curve shows the share reaching at least the indicated number of harness successes.">
    <h3 className="rescue-heading">Can tools solve questions the model previously missed?</h3>
    <div id="rescue-legend-heading" className="rescue-legend-heading">Reasoning effort</div>
    <ul className="chart-legend rescue-legend" aria-labelledby="rescue-legend-heading">{data.rescued.map((r, i) => <li key={r.effort}>
      <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true"><path d="M0 7 H32" stroke={effortStyles[i].color} strokeWidth="2" strokeDasharray={effortStyles[i].dash} /><EffortMark cx={16} cy={7} style={effortStyles[i]} /></svg>
      <span>{r.effort}<span className="cohort-size">n = {r.total}</span></span>
    </li>)}</ul>
    <div className="y-axis-heading">Previously missed questions solved (%)</div>
    <ChartContainer className="research-chart rescue-chart" aria-label="Luna rescue consistency across five reasoning efforts">
      <LineChart data={rows} accessibilityLayer aria-label="Can tools solve questions the model previously missed?" margin={{ top: 16, right: 18, bottom: 8, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="threshold" interval={0} padding={{ left: 16, right: 16 }} tick={<RescueTick />} height={52} tickLine={false} tickMargin={10} axisLine={{ stroke: 'var(--line)' }} />
        <YAxis domain={[0, 50]} ticks={[0,10,20,30,40,50]} tickFormatter={v => `${v}%`} width={52} axisLine={false} tickLine={false} />
        <ChartTooltip cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 4', strokeWidth: 1 }} isAnimationActive={false} content={props => <div role="status" aria-live="polite" aria-atomic="true"><ChartTooltipContent {...props} className="chart-tooltip" labelFormatter={v => `At least ${v} successful ${Number(v) === 1 ? 'attempt' : 'attempts'} out of 8`} formatter={(v, name) => <div className="rescue-tooltip-row"><span>{name} effort</span><strong>{percentage(v)}</strong></div>} /></div>} />
        {data.rescued.map((r, i) => <Line key={r.effort} dataKey={r.effort} type="linear" stroke={effortStyles[i].color} strokeDasharray={effortStyles[i].dash} strokeWidth={2.2} activeDot={false} isAnimationActive={false} dot={props => <EffortMark cx={props.cx} cy={props.cy} style={effortStyles[i]} />} />)}
      </LineChart>
    </ChartContainer>
    <div className="x-axis-heading">Correct answers required across 8 harness attempts</div>
    <div className="threshold-guide"><span>1: solved at least once</span><span>8: successful in all 8 runs</span></div>
    <DataTable rows={rows.map(r => ({ ...r, thresholdLabel: r.threshold === 8 ? 'All 8' : `At least ${r.threshold}` }))} x={{ key: 'thresholdLabel', label: 'Correct answers required across 8 harness attempts' }} series={data.rescued.map(r => ({ key: r.effort, label: `${r.effort} (n=${r.total})` }))} label="Previously missed questions solved (%)" format={percentage} />
  </Figure>;
}

export function LunaBehaviorPlot() {
  return <Figure n={8} caption="Each point is one Luna harness effort setting over 16,000 rollouts. Output tokens include reasoning and sum model calls and captured retries. Tool-use rate is the fraction of rollouts with at least one tool call.">
    <div className="research-grid">{[{ key: 'toolRate', label: 'Rollouts using tools', format: percentage, domain: [0, 65] }, { key: 'modelCalls', label: 'Model calls per rollout', format: number, domain: [0, 4] }].map(s => <section className="chart-panel" key={s.key}>
      <h3>{s.label}</h3><Plot rows={data.behavior} x={{ key: 'output', label: 'Mean output tokens per rollout', numeric: true }} series={[s]} label={s.key === 'toolRate' ? 'Tool-use rate' : 'Average model calls'} domain={s.domain} format={s.format} />
    </section>)}</div>
  </Figure>;
}
