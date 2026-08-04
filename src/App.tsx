import { useEffect, useMemo, useState } from 'react'
import MiniSearch from 'minisearch'
import { DATA_URL, SCHEMA_URL, loadDataset } from './data/load'
import type { DatasetLoadStatus } from './data/load'
import { buildControlRelationships, type ControlRelationship } from './data/relationships'
import type { DefinitionRecord, IndicatorRecord, NormalizedDataset, RuleRecord } from './data/types'

type View = 'overview' | 'rules' | 'controls' | 'definitions' | 'indicators' | 'review'
type RuleFilters = { applicability: string; force: string; process: string; control: string }
type SearchItem = { id: string; kind: 'Definition' | 'Rule' | 'Indicator'; title: string; body: string; meta: string; sourcePath: string }

const REVIEW_STORAGE_KEY = 'fedramp-rules-explorer-review-list-v1'
const emptyFilters: RuleFilters = { applicability: '', force: '', process: '', control: '' }
const navigation: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'rules', label: 'Rules' },
  { id: 'controls', label: 'Controls' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'indicators', label: 'Indicators' },
  { id: 'review', label: 'Review List' },
]

function ruleKey(rule: RuleRecord) { return `${rule.id}|${rule.sourcePath}` }
function readReviewList(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}
function formatRetrievedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function buildSearchItems(data: NormalizedDataset): SearchItem[] {
  return [
    ...data.definitions.map((item) => ({ id: item.id, kind: 'Definition' as const, title: item.term, body: [item.definition, item.note, ...(item.alts ?? [])].filter(Boolean).join(' '), meta: [item.tag, item.applicability].filter(Boolean).join(' · '), sourcePath: item.sourcePath })),
    ...data.rules.map((item) => ({ id: item.id, kind: 'Rule' as const, title: item.statement || item.id, body: [item.processName, item.subset, item.force, ...item.controls, ...item.artifacts].join(' '), meta: `${item.processId} · ${item.applicability} · ${item.force || 'Unspecified force'}`, sourcePath: item.sourcePath })),
    ...data.indicators.map((item) => ({ id: item.id, kind: 'Indicator' as const, title: item.statement || item.id, body: [item.themeName, ...item.controls, ...item.artifacts].join(' '), meta: item.themeName, sourcePath: item.sourcePath })),
  ]
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>
}

function Overview({ data, status, controls }: { data: NormalizedDataset; status: DatasetLoadStatus; controls: ControlRelationship[] }) {
  const processes = new Set(data.rules.map((item) => item.processId)).size
  const themes = new Set(data.indicators.map((item) => item.themeId)).size
  const forceCounts = data.rules.reduce<Record<string, number>>((counts, item) => {
    const key = item.force || 'Unspecified'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  return <>
    {status.warning && <section className="source-warning"><strong>Cached data in use.</strong> {status.warning}</section>}
    <section className="hero-panel">
      <div><span className="eyebrow">Dataset overview</span><h2>{data.info.title}</h2><p>{data.info.description}</p></div>
      <dl className="dataset-meta">
        <div><dt>Version</dt><dd>{data.info.version}</dd></div><div><dt>Last updated</dt><dd>{data.info.last_updated}</dd></div>
        <div><dt>Active source</dt><dd>{status.source === 'official' ? 'Official FedRAMP repository' : 'Last validated local cache'}</dd></div>
        <div><dt>Retrieved</dt><dd>{formatRetrievedAt(status.retrievedAt)}</dd></div><div><dt>Validation</dt><dd>Passed</dd></div>
        <div><dt>Official files</dt><dd><a href={DATA_URL} target="_blank" rel="noreferrer">Rules</a> · <a href={SCHEMA_URL} target="_blank" rel="noreferrer">Schema</a></dd></div>
      </dl>
    </section>
    <section className="stats-grid" aria-label="Dataset totals">
      <StatCard label="Definitions" value={data.definitions.length} /><StatCard label="Rules" value={data.rules.length} /><StatCard label="Controls" value={controls.length} /><StatCard label="Indicators" value={data.indicators.length} /><StatCard label="Processes" value={processes} /><StatCard label="KSI themes" value={themes} />
    </section>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Rule language</span><h2>Requirements by force</h2></div></div><div className="force-grid">{Object.entries(forceCounts).sort((a, b) => b[1] - a[1]).map(([force, count]) => <div className="force-row" key={force}><span>{force}</span><strong>{count}</strong></div>)}</div></section>
  </>
}

function RuleCard({ rule, saved, onOpen, onToggle, onControl }: { rule: RuleRecord; saved: boolean; onOpen: (rule: RuleRecord) => void; onToggle: (rule: RuleRecord) => void; onControl: (id: string) => void }) {
  return <article className="rule-card">
    <button className="rule-card-open" onClick={() => onOpen(rule)}><div className="rule-card-top"><code>{rule.id}</code><span className="force-badge">{rule.force || 'Unspecified'}</span></div><p>{rule.statement || 'No statement supplied.'}</p></button>
    <div className="rule-tags"><span>{rule.applicability === 'all' ? 'Shared' : rule.applicability}</span><span>{rule.processId}</span>{rule.controls.slice(0, 4).map((control) => <button className="chip-button" key={control} onClick={() => onControl(control)}>{control}</button>)}{rule.controls.length > 4 && <span>+{rule.controls.length - 4}</span>}</div>
    <button className={`review-button${saved ? ' saved' : ''}`} onClick={() => onToggle(rule)}>{saved ? 'Remove from review' : 'Mark for review'}</button>
  </article>
}

function RuleDetail({ rule, data, status, saved, onClose, onToggle, onControl }: { rule: RuleRecord; data: NormalizedDataset; status: DatasetLoadStatus; saved: boolean; onClose: () => void; onToggle: (rule: RuleRecord) => void; onControl: (id: string) => void }) {
  const definitions = data.definitions.filter((definition) => rule.terms.includes(definition.id) || rule.statement.toLowerCase().includes(definition.term.toLowerCase()))
  return <section className="detail-page">
    <div className="detail-actions"><button className="back-button" onClick={onClose}>Back</button><button className={`review-button${saved ? ' saved' : ''}`} onClick={() => onToggle(rule)}>{saved ? 'Remove from review' : 'Mark for review'}</button></div>
    <div className="detail-header"><div><span className="eyebrow">{rule.processName}</span><h2>{rule.id}</h2></div><span className="force-badge large">{rule.force || 'Unspecified'}</span></div>
    <section className="detail-section"><h3>Statement</h3><p className="official-text">{rule.statement || 'No statement supplied.'}</p></section>
    <div className="detail-grid"><section className="detail-section"><h3>Applicability</h3><p>{rule.applicability === 'all' ? 'Shared' : rule.applicability}</p></section><section className="detail-section"><h3>Process and subset</h3><p>{rule.processId} · {rule.subset}</p></section></div>
    <section className="detail-section"><h3>Controls</h3><div className="chip-list">{rule.controls.length ? rule.controls.map((item) => <button className="chip-button" key={item} onClick={() => onControl(item)}>{item}</button>) : <p>None listed.</p>}</div></section>
    <section className="detail-section"><h3>Artifacts</h3><ul>{rule.artifacts.length ? rule.artifacts.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>None listed.</li>}</ul></section>
    <section className="detail-section"><h3>Definitions</h3><ul>{definitions.length ? definitions.map((item) => <li key={item.id}><strong>{item.term}</strong> — {item.definition}</li>) : <li>No directly linked definitions found.</li>}</ul></section>
    <section className="detail-section source-info"><h3>Source information</h3><dl><div><dt>Dataset version</dt><dd>{data.info.version}</dd></div><div><dt>Source</dt><dd>{status.source === 'official' ? 'Official FedRAMP repository' : 'Last validated local cache'}</dd></div><div><dt>Source path</dt><dd><code>{rule.sourcePath}</code></dd></div><div><dt>Validation</dt><dd>Passed</dd></div></dl></section>
  </section>
}

function ControlCard({ control, onOpen }: { control: ControlRelationship; onOpen: (control: ControlRelationship) => void }) {
  return <button className="control-card" onClick={() => onOpen(control)}><div><code>{control.id}</code><span>{control.family} family</span></div><dl><div><dt>Rules</dt><dd>{control.rules.length}</dd></div><div><dt>Indicators</dt><dd>{control.indicators.length}</dd></div><div><dt>Processes</dt><dd>{control.processes.length}</dd></div></dl></button>
}

function ControlDetail({ control, onClose, onRule }: { control: ControlRelationship; onClose: () => void; onRule: (rule: RuleRecord) => void }) {
  return <section className="detail-page">
    <div className="detail-actions"><button className="back-button" onClick={onClose}>Back to controls</button></div>
    <div className="detail-header"><div><span className="eyebrow">{control.family} control family</span><h2>{control.id}</h2></div></div>
    <section className="relationship-summary"><StatCard label="Referenced rules" value={control.rules.length} /><StatCard label="Referenced indicators" value={control.indicators.length} /><StatCard label="Processes" value={control.processes.length} /></section>
    <section className="detail-section"><h3>Referenced rules</h3>{control.rules.length ? <div className="relationship-list">{control.rules.map((rule) => <button key={ruleKey(rule)} onClick={() => onRule(rule)}><code>{rule.id}</code><span>{rule.statement}</span><small>{rule.processId} · {rule.force || 'Unspecified'}</small></button>)}</div> : <p>No rules reference this control.</p>}</section>
    <section className="detail-section"><h3>Referenced indicators</h3>{control.indicators.length ? <div className="relationship-list">{control.indicators.map((indicator) => <article key={indicator.id}><code>{indicator.id}</code><span>{indicator.statement}</span><small>{indicator.themeName}</small></article>)}</div> : <p>No indicators reference this control.</p>}</section>
    <section className="detail-section"><h3>Processes</h3><div className="chip-list">{control.processes.map((process) => <span key={process}>{process}</span>)}</div></section>
    <section className="detail-section source-info"><h3>Relationship source</h3><p>Calculated from official control mappings in the current validated FedRAMP dataset.</p></section>
  </section>
}

export default function App() {
  const [data, setData] = useState<NormalizedDataset | null>(null)
  const [status, setStatus] = useState<DatasetLoadStatus | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('overview')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<RuleFilters>(emptyFilters)
  const [selectedRule, setSelectedRule] = useState<RuleRecord | null>(null)
  const [selectedControl, setSelectedControl] = useState<ControlRelationship | null>(null)
  const [reviewKeys, setReviewKeys] = useState<string[]>(readReviewList)

  useEffect(() => { loadDataset().then((result) => { setData(result.data); setStatus(result.status) }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load the dataset.')) }, [])
  useEffect(() => { localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviewKeys)) }, [reviewKeys])

  const controls = useMemo(() => data ? buildControlRelationships(data) : [], [data])
  const openControl = (id: string) => { const control = controls.find((item) => item.id === id); if (control) { setSelectedRule(null); setSelectedControl(control); setView('controls') } }
  const openRule = (rule: RuleRecord) => { setSelectedControl(null); setSelectedRule(rule); setView('rules') }
  const toggleReview = (rule: RuleRecord) => { const key = ruleKey(rule); setReviewKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]) }

  const searchItems = useMemo(() => data ? buildSearchItems(data) : [], [data])
  const searchIndex = useMemo(() => { const index = new MiniSearch<SearchItem>({ fields: ['id', 'title', 'body', 'meta'], storeFields: ['id', 'kind', 'title', 'body', 'meta', 'sourcePath'], searchOptions: { prefix: true, fuzzy: 0.2, boost: { id: 4, title: 2 } } }); index.addAll(searchItems); return index }, [searchItems])
  const globalResults = useMemo(() => query.trim() ? searchIndex.search(query).slice(0, 50) as unknown as SearchItem[] : [], [query, searchIndex])
  const ruleOptions = useMemo(() => data ? { processes: [...new Set(data.rules.map((item) => item.processId))].sort(), controls: controls.map((item) => item.id), forces: [...new Set(data.rules.map((item) => item.force).filter(Boolean))].sort() } : { processes: [], controls: [], forces: [] }, [data, controls])
  const filteredRules = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    return data.rules.filter((rule) => (!needle || [rule.id, rule.processName, rule.statement, rule.force, rule.subset, ...rule.controls, ...rule.artifacts].join(' ').toLowerCase().includes(needle)) && (!filters.applicability || rule.applicability === filters.applicability) && (!filters.force || rule.force === filters.force) && (!filters.process || rule.processId === filters.process) && (!filters.control || rule.controls.includes(filters.control)))
  }, [data, query, filters])
  const filteredControls = useMemo(() => { const needle = query.trim().toLowerCase(); return controls.filter((control) => !needle || [control.id, control.family, ...control.processes].join(' ').toLowerCase().includes(needle)) }, [controls, query])
  const reviewRules = useMemo(() => data ? data.rules.filter((rule) => reviewKeys.includes(ruleKey(rule))) : [], [data, reviewKeys])

  if (error) return <main className="state-screen"><h1>FedRAMP Rules Explorer</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!data || !status) return <main className="state-screen"><div className="loader" /><h1>Loading and validating FedRAMP rules</h1></main>

  const definitions = data.definitions.filter((item: DefinitionRecord) => [item.id, item.term, item.definition, item.tag, ...(item.alts ?? [])].join(' ').toLowerCase().includes(query.toLowerCase()))
  const indicators = data.indicators.filter((item: IndicatorRecord) => [item.id, item.themeName, item.statement, ...item.controls].join(' ').toLowerCase().includes(query.toLowerCase()))
  const selectedSaved = selectedRule ? reviewKeys.includes(ruleKey(selectedRule)) : false
  const pageTitle = selectedRule?.id ?? selectedControl?.id ?? navigation.find((item) => item.id === view)?.label

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span>FR</span><div><strong>FedRAMP</strong><small>Rules Explorer</small></div></div><nav>{navigation.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setSelectedRule(null); setSelectedControl(null) }}>{item.label}{item.id === 'review' && reviewKeys.length > 0 ? ` (${reviewKeys.length})` : ''}</button>)}</nav><div className="sidebar-note"><strong>{status.source === 'official' ? 'Official source active' : 'Cached source active'}</strong><span>{data.info.version} · Validation passed</span></div></aside>
    <main className="main-content"><header className="topbar"><div><span className="eyebrow">FedRAMP 2026</span><h1>{pageTitle}</h1></div>{!selectedRule && !selectedControl && view !== 'review' && <label className="search-box"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, term, statement, control…" /></label>}</header>
      {selectedRule ? <RuleDetail rule={selectedRule} data={data} status={status} saved={selectedSaved} onClose={() => setSelectedRule(null)} onToggle={toggleReview} onControl={openControl} /> : selectedControl ? <ControlDetail control={selectedControl} onClose={() => setSelectedControl(null)} onRule={openRule} /> : view === 'overview' ? (
        query.trim() ? <section className="panel"><div className="section-heading"><div><span className="eyebrow">Global search</span><h2>{globalResults.length} results</h2></div><button className="text-button" onClick={() => setQuery('')}>Clear</button></div><div className="records-list">{globalResults.map((item) => <article className="record-card" key={`${item.kind}-${item.id}`}><div className="record-header"><span className={`kind kind-${item.kind.toLowerCase()}`}>{item.kind}</span><code>{item.id}</code></div><h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section> : <Overview data={data} status={status} controls={controls} />
      ) : view === 'rules' ? (
        <div className="rules-layout"><aside className="filter-panel"><div className="filter-heading"><h2>Filters</h2><button className="text-button" onClick={() => setFilters(emptyFilters)}>Clear</button></div><label>Framework<select value={filters.applicability} onChange={(event) => setFilters({ ...filters, applicability: event.target.value })}><option value="">All</option><option value="all">Shared</option><option value="20x">20x</option><option value="rev5">Rev5</option></select></label><label>Force<select value={filters.force} onChange={(event) => setFilters({ ...filters, force: event.target.value })}><option value="">All</option>{ruleOptions.forces.map((item) => <option key={item}>{item}</option>)}</select></label><label>Process<select value={filters.process} onChange={(event) => setFilters({ ...filters, process: event.target.value })}><option value="">All</option>{ruleOptions.processes.map((item) => <option key={item}>{item}</option>)}</select></label><label>Control<select value={filters.control} onChange={(event) => setFilters({ ...filters, control: event.target.value })}><option value="">All</option>{ruleOptions.controls.map((item) => <option key={item}>{item}</option>)}</select></label></aside><section className="panel rules-panel"><div className="section-heading"><div><span className="eyebrow">Filtered rules</span><h2>{filteredRules.length.toLocaleString()} results</h2></div></div><div className="rule-grid">{filteredRules.slice(0, 300).map((rule) => <RuleCard key={ruleKey(rule)} rule={rule} saved={reviewKeys.includes(ruleKey(rule))} onOpen={openRule} onToggle={toggleReview} onControl={openControl} />)}</div></section></div>
      ) : view === 'controls' ? (
        <section className="panel"><div className="section-heading"><div><span className="eyebrow">Relationship index</span><h2>{filteredControls.length.toLocaleString()} controls</h2></div></div><div className="control-grid">{filteredControls.map((control) => <ControlCard key={control.id} control={control} onOpen={setSelectedControl} />)}</div></section>
      ) : view === 'review' ? (
        <section className="panel"><div className="section-heading"><div><span className="eyebrow">Saved locally</span><h2>{reviewRules.length.toLocaleString()} rules marked for review</h2></div>{reviewRules.length > 0 && <button className="text-button" onClick={() => setReviewKeys([])}>Clear list</button>}</div>{reviewRules.length ? <div className="rule-grid">{reviewRules.map((rule) => <RuleCard key={ruleKey(rule)} rule={rule} saved onOpen={openRule} onToggle={toggleReview} onControl={openControl} />)}</div> : <div className="empty-review"><h3>No rules marked for review</h3><p>Open the Rules page and mark any rule you want to return to later.</p><button className="primary-button" onClick={() => setView('rules')}>Browse rules</button></div>}</section>
      ) : view === 'definitions' ? (
        <section className="panel"><div className="section-heading"><div><span className="eyebrow">Browse</span><h2>{definitions.length.toLocaleString()} definitions</h2></div></div><div className="records-list">{definitions.slice(0, 250).map((item) => <article className="record-card" key={item.id}><div className="record-header"><span className="kind kind-definition">Definition</span><code>{item.id}</code></div><h3>{item.term}</h3><p>{item.definition}</p></article>)}</div></section>
      ) : <section className="panel"><div className="section-heading"><div><span className="eyebrow">Browse</span><h2>{indicators.length.toLocaleString()} indicators</h2></div></div><div className="records-list">{indicators.slice(0, 250).map((item) => <article className="record-card" key={item.id}><div className="record-header"><span className="kind kind-indicator">Indicator</span><code>{item.id}</code></div><h3>{item.themeName}</h3><p>{item.statement}</p><div className="chip-list">{item.controls.map((control) => <button className="chip-button" key={control} onClick={() => openControl(control)}>{control}</button>)}</div></article>)}</div></section>}
    </main>
  </div>
}
