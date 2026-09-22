'use client';
import { Bar, BarChart, CartesianGrid, Cell, ErrorBar, LabelList, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui';
import data from './chart-data.json';
import { pass8Interval } from './confidence';
const config = {
    pass1: { label: 'Pass@1', color: 'var(--plot-blue)' },
    pass8: { label: 'Pass@8', color: 'var(--plot-green)' },
    null: { label: 'NullHarness', color: 'var(--plot-blue)' },
    codex: { label: 'Codex harness', color: 'var(--plot-coral)' },
    mean: { label: 'Average turns', color: 'var(--plot-blue)' },
};
const percent = (value) => `${Number(value).toFixed(1)}%`;
const names = { '4B': 'Qwen-3.5 4B', '9B': 'Qwen-3.5 9B', '27B': 'Qwen-3.6 27B', '397B': 'Qwen-3.5 397B (17B active)' };
function ModelTick({ x = 0, y = 0, payload }) {
    return <g transform={`translate(${x},${y})`} className="model-tick">
    <text textAnchor="middle" y={18}>{payload?.value}</text>
    {payload?.value === '397B' && <text textAnchor="middle" y={35} className="active-params">17B active</text>}
  </g>;
}
function Legend({ series }) {
    return <ul className="chart-legend" aria-label="Legend">{series.map(key => <li key={key}>
    <span className={`legend-swatch ${key}`} style={{ background: config[key].color }} aria-hidden="true"/>{config[key].label}
  </li>)}</ul>;
}
function MetricLines({ values, metric, domain, ticks, title, confidence = false }) {
    const series = metric ? [metric] : ['pass1', 'pass8'];
    return <>
    <div className="y-axis-heading">{metric ? config[metric].label : 'Pass rate'}</div>
    <ChartContainer config={config} className={`native-chart ${metric ? 'category-chart' : 'overall-chart'}`} aria-label={title}>
      <LineChart data={values} margin={{ top: 28, right: 10, bottom: 2, left: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--line)"/>
        <XAxis dataKey="model" interval={0} tick={<ModelTick />} tickLine={false} axisLine={{ stroke: 'var(--line)' }} height={52} padding={{ left: 25, right: 36 }}/>
        <YAxis domain={domain} ticks={ticks} tickFormatter={v => `${v}%`} width={44} tickLine={false} axisLine={false} tickMargin={8}/>
        <ChartTooltip cursor={{ stroke: 'var(--muted)', strokeDasharray: '3 4' }} content={<ChartTooltipContent className="chart-tooltip" labelFormatter={label => names[String(label)] || label} formatter={(value, name, item) => <><div className="tooltip-row"><span>{config[name]?.label || name}</span><strong>{Number(value).toFixed(2)}%</strong></div>{confidence && <div>95% CI: {percent(item.payload.pass8Lower)} to {percent(item.payload.pass8Upper)}</div>}</>}/>}/>
        {series.map(key => <Line key={key} type="linear" dataKey={key} stroke={metric ? 'var(--plot-blue)' : config[key].color} strokeWidth={2.6} dot={key === 'pass8' && !metric ? ({ cx, cy }) => <rect key={`${cx}-${cy}`} x={(cx ?? 0) - 4} y={(cy ?? 0) - 4} width={8} height={8} fill="var(--plot-green)"/> : { r: 4, fill: 'var(--plot-blue)', strokeWidth: 0 }} activeDot={{ r: 6, stroke: 'var(--paper)', strokeWidth: 2 }} isAnimationActive={false}>
          {confidence ? <ErrorBar dataKey="pass8Error" direction="y" width={5} stroke="var(--plot-blue)" strokeWidth={1.5} isAnimationActive={false}/> : <LabelList dataKey={key} position="top" offset={12} formatter={percent} fill={metric ? 'var(--plot-blue)' : config[key].color} className="point-label"/>}
        </Line>)}
        {confidence && <Line dataKey="pass8Upper" stroke="none" dot={false} activeDot={false} tooltipType="none" legendType="none" isAnimationActive={false}>
          <LabelList dataKey="pass8" position="top" offset={10} formatter={percent} fill="var(--plot-blue)" className="point-label"/>
        </Line>}
      </LineChart>
    </ChartContainer>
    <div className="x-axis-heading">Model size</div>
    <table className="sr-only"><caption>{title}</caption><thead><tr><th>Model</th>{series.map(key => <th key={key}>{config[key].label}</th>)}{confidence && <th>95% Wilson confidence interval</th>}</tr></thead>
      <tbody>{values.map(row => <tr key={row.model}><th>{names[row.model]}</th>{series.map(key => <td key={key}>{row[key]}%</td>)}{confidence && <td>{percent(row.pass8Lower)} to {percent(row.pass8Upper)}</td>}</tr>)}</tbody>
    </table>
  </>;
}
function Histogram() {
    return <>
    <Legend series={['null', 'codex']}/>
    <div className="y-axis-heading">Problem count</div>
    <ChartContainer config={config} className="native-chart histogram-chart" aria-label="Qwen-3.6 27B successful rollout distribution">
      <BarChart data={data.histogram} margin={{ top: 26, right: 8, bottom: 0, left: 0 }} barCategoryGap="18%" barGap={2} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--line)"/>
        <XAxis dataKey="successes" interval={0} tickLine={false} axisLine={{ stroke: 'var(--line)' }} tickMargin={10} height={36}/>
        <YAxis domain={[0, 686.28]} ticks={[0, 100, 200, 300, 400, 500, 600]} width={44} tickMargin={8} axisLine={false} tickLine={false}/>
        <ChartTooltip cursor={{ fill: 'var(--line)' }} content={<ChartTooltipContent className="chart-tooltip" labelFormatter={label => `${label} / 8 successful rollouts`} formatter={(value, name) => <div className="tooltip-row"><span>{config[name]?.label || name}</span><strong>{String(value)} problems</strong></div>}/>}/>
        {['null', 'codex'].map(key => <Bar key={key} dataKey={key} fill={config[key].color} maxBarSize={36} isAnimationActive={false}>
          <LabelList dataKey={key} position="top" offset={8} fill={config[key].color} className="bar-value"/>
        </Bar>)}
      </BarChart>
    </ChartContainer>
    <div className="x-axis-heading">Successful rollouts per problem (out of 8)</div>
    <table className="sr-only"><caption>Qwen-3.6 27B rollout outcomes</caption><thead><tr><th>Successful rollouts</th><th>NullHarness</th><th>Codex harness</th></tr></thead>
      <tbody>{data.histogram.map(row => <tr key={row.successes}><th>{row.successes}</th><td>{row.null}</td><td>{row.codex}</td></tr>)}</tbody>
    </table>
  </>;
}
function ScaffoldingBars({ turns = false }) {
    const rows = turns ? data.turns.map(({ outcome, ...row }) => ({ label: outcome, ...row })) : data.scaffolding.map(({ setup, ...row }) => ({ label: setup, ...row }));
    const keys = turns ? ['mean'] : ['pass1', 'pass8'];
    const label = turns ? 'Average assistant turns per rollout' : 'Pass rate';
    return <>
    {!turns && <Legend series={['pass1', 'pass8']}/>}
    <div className="y-axis-heading">{label}</div>
    <ChartContainer config={config} className="native-chart overall-chart" aria-label={label}>
      <BarChart data={rows} margin={{ top: 28, right: 18, bottom: 0, left: 0 }} barGap={6} barCategoryGap="25%" accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--line)"/>
        <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line)' }} interval={0} height={40} tickMargin={12}/>
        <YAxis width={44} tickLine={false} axisLine={false} domain={turns ? [0, 4.5] : [0, 90]} tickFormatter={v => turns ? String(v) : `${v}%`}/>
        <ChartTooltip cursor={{ fill: 'var(--line)' }} content={<ChartTooltipContent className="chart-tooltip" formatter={(value, name) => <div className="tooltip-row"><span>{config[name]?.label || name}</span><strong>{Number(value).toFixed(2)}{turns ? '' : '%'}</strong></div>}/>}/>
        {keys.map(key => <Bar key={key} dataKey={key} fill={config[key].color} maxBarSize={turns ? 140 : 100} isAnimationActive={false}>
          {turns && ['var(--plot-coral)', 'var(--plot-gold)', 'var(--plot-green)'].map((fill, i) => <Cell key={i} fill={fill}/>)}
          <LabelList dataKey={key} position="top" offset={10} formatter={v => turns ? Number(v).toFixed(2) : percent(v)} fill="var(--ink)" className="point-label"/>
        </Bar>)}
      </BarChart>
    </ChartContainer>
    <div className="x-axis-heading">{turns ? 'Problem outcome across eight rollouts' : 'Qwen-3.6 27B inference setup'}</div>
    <table className="sr-only"><caption>{label}</caption><thead><tr><th>{turns ? 'Outcome' : 'Setup'}</th>{keys.map(k => <th key={k}>{config[k].label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}><th>{r.label}</th>{keys.map(k => <td key={k}>{r[k]}</td>)}</tr>)}</tbody></table>
  </>;
}
function CategoryDeltas() {
    return <>
    <Legend series={['pass1', 'pass8']}/>
    <div className="delta-panels">{data.categoryDeltas.map(row => <section className="chart-panel" key={row.category}>
      <h4>{row.category}</h4>
      <ChartContainer config={config} className="native-chart delta-chart" aria-label={`${row.category}: change with harness`}>
        <BarChart data={[row]} layout="vertical" margin={{ left: 15, right: 40, top: 0, bottom: 0 }} barGap={6} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="var(--line)"/>
          <XAxis type="number" domain={[-3.2, 6.2]} ticks={[-2, 0, 2, 4, 6]} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}/>
          <YAxis type="category" dataKey="category" hide/>
          <ReferenceLine x={0} stroke="var(--muted)"/>
          <ChartTooltip cursor={false} content={<ChartTooltipContent className="chart-tooltip" hideLabel formatter={(value, name) => <div className="tooltip-row"><span>{config[name]?.label}</span><strong>{Number(value) > 0 ? '+' : ''}{Number(value).toFixed(2)} pp</strong></div>}/>}/>
          {['pass1', 'pass8'].map(key => <Bar key={key} dataKey={key} fill={config[key].color} maxBarSize={22} isAnimationActive={false}>
            <LabelList dataKey={key} content={({ viewBox, value }) => {
                    if (!viewBox || !('x' in viewBox))
                        return null;
                    const v = Number(value), x = Number(viewBox.x), y = Number(viewBox.y), width = Number(viewBox.width), height = Number(viewBox.height);
                    return <text x={v >= 0 ? Math.max(x, x + width) + 8 : Math.min(x, x + width) - 8} y={y + height / 2} dominantBaseline="central" textAnchor={v >= 0 ? 'start' : 'end'} fill="var(--ink)" fontSize={13}>{v > 0 ? '+' : ''}{v.toFixed(1)} pp</text>;
                }}/>
          </Bar>)}
        </BarChart>
      </ChartContainer>
    </section>)}</div>
    <div className="x-axis-heading">Change from NullHarness (percentage points)</div>
    <table className="sr-only"><caption>Category-specific harness changes</caption><thead><tr><th>Category</th><th>Pass@1 change (pp)</th><th>Pass@8 change (pp)</th></tr></thead><tbody>{data.categoryDeltas.map(r => <tr key={r.category}><th>{r.category}</th><td>{r.pass1}</td><td>{r.pass8}</td></tr>)}</tbody></table>
  </>;
}
function InterventionEffects() {
    const small = data.overall.find(row => row.model === '4B');
    const large = data.overall.find(row => row.model === '27B');
    const harness = data.scaffolding.find(row => row.setup === 'Codex harness');
    const rows = [
        { label: 'Scale model', detail: '4B to 27B', pass1: large.pass1 - small.pass1, pass8: large.pass8 - small.pass8 },
        { label: 'Add harness', detail: 'at 27B', pass1: harness.pass1 - large.pass1, pass8: harness.pass8 - large.pass8 },
    ];
    const change = (v) => `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(2)} pp`;
    return <>
    <Legend series={['pass1', 'pass8']}/>
    <div className="y-axis-heading">Change in pass rate (percentage points)</div>
    <ChartContainer config={config} className="native-chart overall-chart" aria-label="Effects of scaling and scaffolding">
      <BarChart data={rows} margin={{ top: 28, right: 12, bottom: 0, left: 0 }} barGap={6} barCategoryGap="22%" accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--line)"/>
        <XAxis dataKey="label" interval={0} tickLine={false} axisLine={{ stroke: 'var(--line)' }} height={52} tick={({ x, y, payload }) => <g transform={`translate(${x},${y})`} className="model-tick">
          <text y={18} textAnchor="middle">{payload.value}</text>
          <text y={36} textAnchor="middle">{rows.find(row => row.label === payload.value)?.detail}</text>
        </g>}/>
        <YAxis domain={[-1.4, 10.5]} ticks={[0, 2, 4, 6, 8, 10]} width={44} axisLine={false} tickLine={false}/>
        <ReferenceLine y={0} stroke="var(--muted)"/>
        <ChartTooltip cursor={{ fill: 'var(--line)' }} content={<ChartTooltipContent className="chart-tooltip" formatter={(value, name) => <div className="tooltip-row"><span>{config[name]?.label}</span><strong>{change(value)}</strong></div>}/>}/>
        {['pass1', 'pass8'].map(key => <Bar key={key} dataKey={key} fill={config[key].color} maxBarSize={100} isAnimationActive={false}>
          <LabelList dataKey={key} content={({ viewBox, value }) => {
                if (!viewBox || !('x' in viewBox))
                    return null;
                const v = Number(value), x = Number(viewBox.x), y = Number(viewBox.y), w = Number(viewBox.width), h = Number(viewBox.height);
                return <text x={x + w / 2} y={v >= 0 ? Math.min(y, y + h) - 10 : Math.max(y, y + h) + 19} textAnchor="middle" fill="var(--ink)" className="point-label">{change(v)}</text>;
            }}/>
        </Bar>)}
      </BarChart>
    </ChartContainer>
    <div className="x-axis-heading">Intervention</div>
    <table className="sr-only"><caption>Effects of scaling and scaffolding</caption><thead><tr><th>Intervention</th><th>Pass@1 change (pp)</th><th>Pass@8 change (pp)</th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th>{row.label} {row.detail}</th><td>{row.pass1}</td><td>{row.pass8}</td></tr>)}</tbody></table>
  </>;
}
export function NativePlot({ kind, expanded = false }) {
    if (kind === 'effects')
        return <div className={`native-plot ${expanded ? 'expanded-plot' : ''}`} data-plot={kind}><InterventionEffects /></div>;
    return <div className={`native-plot ${expanded ? 'expanded-plot' : ''}`} data-plot={kind}>
    {kind === 'scaffolding' ? <ScaffoldingBars /> : kind === 'turns' ? <ScaffoldingBars turns/> : kind === 'categoryDeltas' ? <CategoryDeltas /> : kind === 'histogram' ? <Histogram /> : kind === 'overall' ? <>
      <Legend series={['pass1', 'pass8']}/>
      <MetricLines values={data.overall} domain={[40, 86]} ticks={[40, 50, 60, 70, 80]} title="Pass@1 and Pass@8 across model sizes"/>
    </> : <>
      <div className="chart-grid">{data.categories.map(category => {
                const confidence = kind === 'pass8';
                const rows = category.values.map(row => confidence ? { ...row, ...pass8Interval(row.passed, category.problems) } : row);
                const lower = Math.max(0, Math.floor((Math.min(...rows.map(row => confidence ? row.pass8Lower : row[kind])) - 3.5) / 5) * 5);
                const upper = Math.min(100, Math.ceil((Math.max(...rows.map(row => confidence ? row.pass8Upper : row[kind])) + 3.5) / 5) * 5);
                const ticks = Array.from({ length: Math.round((upper - lower) / 5) + 1 }, (_, i) => lower + i * 5);
                return <section className="chart-panel" key={category.id} aria-label={category.label}>
          <h4>{category.label}</h4>
          <MetricLines values={rows} metric={kind} domain={[lower, upper]} ticks={ticks} confidence={confidence} title={`${category.label}: ${config[kind].label}`}/>
        </section>;
            })}</div>
    </>}
  </div>;
}
