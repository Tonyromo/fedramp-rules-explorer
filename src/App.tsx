import { useEffect, useMemo, useState } from 'react'
import MiniSearch from 'minisearch'
import { DATA_URL, SCHEMA_URL, loadDataset } from './data/load'
import type { DatasetLoadStatus } from './data/load'
import type { DefinitionRecord, IndicatorRecord, NormalizedDataset, RuleRecord } from './data/types'

type View = 'overview' | 'definitions' | 'rules' | 'indicators'
type SearchItem = {
  id: string
  kind: 'Definition' | 'Rule' | 'Indicator'
  title: string
  body: string
  meta: string
  sourcePath: string
}

type RuleFilters = {
  applicability: string
  force: string
  process: string
  control: string
}

const navigation: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'rules', label: 'Rules' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'indicators', label: 'Indicators' },
]

const emptyFilters: RuleFilters = { applicability: '', force: '', process: '', control: '' }

function buildSearchItems(data: NormalizedDataset): SearchItem[] {
  return [
    ...data.definitions.map((item) => ({
      id: item.id,
      kind: 'Definition' as const,
      title: item.term,
      body: [item.definition, item.note, ...(item.alts ?? [])].filter(Boolean).join(' '),
      meta: [item.tag, item.applicability].filter(Boolean).join(' · '),
      sourcePath: item.sourcePath,
    })),
    ...data.rules.map((item) => ({
      id: item.id,
      kind: 'Rule' as const,
      title: item.statement || item.id,
      body: [item.processName, item.subset, item.force, ...item.controls, ...item.artifacts].join(' '),
      meta: `${item.processId} · ${item.applicability} · ${item.force || 'Unspecified force'}`,
      sourcePath: item.sourcePath,
    })),
    ...data.indicators.map((item) => ({
      id: item.id,
      kind: 'Indicator' as const,
      title: item.statement || item.id,
      body: [item.themeName, ...item.controls, ...item.artifacts].join(' '),
      meta: item.themeName,
      sourcePath: item.sourcePath,
    })),
  ]
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong></article>
}

function formatRetrievedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function Overview({ data, status }: { data: NormalizedDataset; status: DatasetLoadStatus }) {
  const processes = new Set(data.rules.map((item) => item.processId)).size
  const themes = new Set(data.indicators.map((item) => item.themeId)).size
  const forceCounts = data.rules.reduce<Record<string, number>>((counts, item) => {
    const key = item.force || 'Unspecified'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})

  return (
    <>
      {status.warning && <section className="source-warning"><strong>Cached data in use.</strong> {status.warning}</section>}
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Dataset overview</span>
          <h2>{data.info.title}</h2>
          <p>{data.info.description}</p>
        </div>
        <dl className="dataset-meta">
          <div><dt>Version</dt><dd>{data.info.version}</dd></div>
          <div><dt>Last updated</dt><dd>{data.info.last_updated}</dd></div>
          <div><dt>Active source</dt><dd>{status.source === 'official' ? 'Official FedRAMP repository' : 'Last validated local cache'}</dd></div>
          <div><dt>Retrieved</dt><dd>{formatRetrievedAt(status.retrievedAt)}</dd></div>
          <div><dt>Validation</dt><dd>Passed</dd></div>
          <div><dt>Official files</dt><dd><a href={DATA_URL} target="_blank" rel="noreferrer">Rules</a> · <a href={SCHEMA_URL} target="_blank" rel="noreferrer">Schema</a></dd></div>
        </dl>
      </section>
      <section className="stats-grid" aria-label="Dataset totals">
        <StatCard label="Definitions" value={data.definitions.length} />
        <StatCard label="Rules" value={data.rules.length} />
        <StatCard label="Processes" value={processes} />
        <StatCard label="Indicators" value={data.indicators.length} />
        <StatCard label="KSI themes" value={themes} />
      </section>
      <section className="panel">
        <div className="section-heading"><div><span className="eyebrow">Rule language</span><h2>Requirements by force</h2></div></div>
        <div className="force-grid">
          {Object.entries(forceCounts).sort((a, b) => b[1] - a[1]).map(([force, count]) => (
            <div className="force-row" key={force}><span>{force}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>
    </>
  )
}

function RuleCard({ rule, onOpen }: { rule: RuleRecord; onOpen: (rule: RuleRecord) => void }) {
  return (
    <button className="rule-card" onClick={() => onOpen(rule)}>
      <div className="rule-card-top"><code>{rule.id}</code><span className="force-badge">{rule.force || 'Unspecified'}</span></div>
      <p>{rule.statement || 'No statement supplied.'}</p>
      <div className="rule-tags">
        <span>{rule.applicability === 'all' ? 'Shared' : rule.applicability}</span>
        <span>{rule.processId}</span>
        {rule.controls.slice(0, 4).map((control) => <span key={control}>{control}</span>)}
        {rule.controls.length > 4 && <span>+{rule.controls.length - 4}</span>}
      </div>
    </button>
  )
}

function RuleDetail({ rule, data, status, onClose }: { rule: RuleRecord; data: NormalizedDataset; status: DatasetLoadStatus; onClose: () => void }) {
  const definitions = data.definitions.filter((definition) => rule.terms.includes(definition.id) || rule.statement.toLowerCase().includes(definition.term.toLowerCase()))
  return (
    <section className="detail-page">
      <button className="back-button" onClick={onClose}>Back to rules</button>
      <div className="detail-header">
        <div><span className="eyebrow">{rule.processName}</span><h2>{rule.id}</h2></div>
        <span className="force-badge large">{rule.force || 'Unspecified'}</span>
      </div>
      <section className="detail-section"><h3>Statement</h3><p className="official-text">{rule.statement || 'No statement supplied.'}</p></section>
      <div className="detail-grid">
        <section className="detail-section"><h3>Applicability</h3><p>{rule.applicability === 'all' ? 'Shared' : rule.applicability}</p></section>
        <section className="detail-section"><h3>Process and subset</h3><p>{rule.processId} · {rule.subset}</p></section>
      </div>
      <section className="detail-section"><h3>Controls</h3><div className="chip-list">{rule.controls.length ? rule.controls.map((item) => <span key={item}>{item}</span>) : <p>None listed.</p>}</div></section>
      <section className="detail-section"><h3>Artifacts</h3><ul>{rule.artifacts.length ? rule.artifacts.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>None listed.</li>}</ul></section>
      <section className="detail-section"><h3>Definitions</h3><ul>{definitions.length ? definitions.map((item) => <li key={item.id}><strong>{item.term}</strong> — {item.definition}</li>) : <li>No directly linked definitions found.</li>}</ul></section>
      <section className="detail-section source-info">
        <h3>Source information</h3>
        <dl>
          <div><dt>Dataset version</dt><dd>{data.info.version}</dd></div>
          <div><dt>Source</dt><dd>{status.source === 'official' ? 'Official FedRAMP repository' : 'Last validated local cache'}</dd></div>
          <div><dt>Source path</dt><dd><code>{rule.sourcePath}</code></dd></div>
          <div><dt>Validation</dt><dd>Passed</dd></div>
        </dl>
      </section>
    </section>
  )
}

export default function App() {
  const [data, setData] = useState<NormalizedDataset | null>(null)
  const [status, setStatus] = useState<DatasetLoadStatus | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('overview')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<RuleFilters>(emptyFilters)
  const [selectedRule, setSelectedRule] = useState<RuleRecord | null>(null)

  useEffect(() => {
    loadDataset().then((result) => { setData(result.data); setStatus(result.status) }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Unable to load the dataset.')
    })
  }, [])

  const searchItems = useMemo(() => (data ? buildSearchItems(data) : []), [data])
  const searchIndex = useMemo(() => {
    const index = new MiniSearch<SearchItem>({ fields: ['id', 'title', 'body', 'meta'], storeFields: ['id', 'kind', 'title', 'body', 'meta', 'sourcePath'], searchOptions: { prefix: true, fuzzy: 0.2, boost: { id: 4, title: 2 } } })
    index.addAll(searchItems)
    return index
  }, [searchItems])

  const globalResults = useMemo(() => query.trim() ? searchIndex.search(query).slice(0, 50) as unknown as SearchItem[] : [], [query, searchIndex])

  const ruleOptions = useMemo(() => {
    if (!data) return { processes: [], controls: [], forces: [] }
    return {
      processes: [...new Set(data.rules.map((item) => item.processId))].sort(),
      controls: [...new Set(data.rules.flatMap((item) => item.controls))].sort(),
      forces: [...new Set(data.rules.map((item) => item.force).filter(Boolean))].sort(),
    }
  }, [data])

  const filteredRules = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    return data.rules.filter((rule) => {
      const matchesText = !needle || [rule.id, rule.processName, rule.statement, rule.force, rule.subset, ...rule.controls, ...rule.artifacts].join(' ').toLowerCase().includes(needle)
      return matchesText
        && (!filters.applicability || rule.applicability === filters.applicability)
        && (!filters.force || rule.force === filters.force)
        && (!filters.process || rule.processId === filters.process)
        && (!filters.control || rule.controls.includes(filters.control))
    })
  }, [data, query, filters])

  if (error) return <main className="state-screen"><h1>FedRAMP Rules Explorer</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  if (!data || !status) return <main className="state-screen"><div className="loader" /><h1>Loading and validating FedRAMP rules</h1></main>

  const definitions = data.definitions.filter((item: DefinitionRecord) => [item.id, item.term, item.definition, item.tag, ...(item.alts ?? [])].join(' ').toLowerCase().includes(query.toLowerCase()))
  const indicators = data.indicators.filter((item: IndicatorRecord) => [item.id, item.themeName, item.statement, ...item.controls].join(' ').toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FR</span><div><strong>FedRAMP</strong><small>Rules Explorer</small></div></div>
        <nav>{navigation.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); setSelectedRule(null) }}>{item.label}</button>)}</nav>
        <div className="sidebar-note"><strong>{status.source === 'official' ? 'Official source active' : 'Cached source active'}</strong><span>{data.info.version} · Validation passed</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">FedRAMP 2026</span><h1>{selectedRule ? selectedRule.id : navigation.find((item) => item.id === view)?.label}</h1></div>
          {!selectedRule && <label className="search-box"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, term, statement, control…" /></label>}
        </header>

        {selectedRule ? <RuleDetail rule={selectedRule} data={data} status={status} onClose={() => setSelectedRule(null)} /> : view === 'overview' ? (
          query.trim() ? <section className="panel"><div className="section-heading"><div><span className="eyebrow">Global search</span><h2>{globalResults.length} results</h2></div><button className="text-button" onClick={() => setQuery('')}>Clear</button></div><div className="records-list">{globalResults.map((item) => <article className="record-card" key={`${item.kind}-${item.id}`}><div className="record-header"><span className={`kind kind-${item.kind.toLowerCase()}`}>{item.kind}</span><code>{item.id}</code></div><h3>{item.title}</h3><p>{item.body}</p><div className="record-footer"><span>{item.meta}</span><code>{item.sourcePath}</code></div></article>)}</div></section> : <Overview data={data} status={status} />
        ) : view === 'rules' ? (
          <div className="rules-layout">
            <aside className="filter-panel">
              <div className="filter-heading"><h2>Filters</h2><button className="text-button" onClick={() => setFilters(emptyFilters)}>Clear</button></div>
              <label>Framework<select value={filters.applicability} onChange={(event) => setFilters({ ...filters, applicability: event.target.value })}><option value="">All</option><option value="all">Shared</option><option value="20x">20x</option><option value="rev5">Rev5</option></select></label>
              <label>Force<select value={filters.force} onChange={(event) => setFilters({ ...filters, force: event.target.value })}><option value="">All</option>{ruleOptions.forces.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Process<select value={filters.process} onChange={(event) => setFilters({ ...filters, process: event.target.value })}><option value="">All</option>{ruleOptions.processes.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Control<select value={filters.control} onChange={(event) => setFilters({ ...filters, control: event.target.value })}><option value="">All</option>{ruleOptions.controls.map((item) => <option key={item}>{item}</option>)}</select></label>
            </aside>
            <section className="panel rules-panel"><div className="section-heading"><div><span className="eyebrow">Filtered rules</span><h2>{filteredRules.length.toLocaleString()} results</h2></div></div><div className="rule-grid">{filteredRules.slice(0, 300).map((rule) => <RuleCard key={`${rule.id}-${rule.sourcePath}`} rule={rule} onOpen={setSelectedRule} />)}</div>{filteredRules.length > 300 && <p className="result-note">Showing the first 300 results. Narrow the search or filters to find a specific rule.</p>}</section>
          </div>
        ) : view === 'definitions' ? (
          <section className="panel"><div className="section-heading"><div><span className="eyebrow">Browse</span><h2>{definitions.length.toLocaleString()} definitions</h2></div></div><div className="records-list">{definitions.slice(0, 250).map((item) => <article className="record-card" key={item.id}><div className="record-header"><span className="kind kind-definition">Definition</span><code>{item.id}</code></div><h3>{item.term}</h3><p>{item.definition}</p></article>)}</div></section>
        ) : (
          <section className="panel"><div className="section-heading"><div><span className="eyebrow">Browse</span><h2>{indicators.length.toLocaleString()} indicators</h2></div></div><div className="records-list">{indicators.slice(0, 250).map((item) => <article className="record-card" key={item.id}><div className="record-header"><span className="kind kind-indicator">Indicator</span><code>{item.id}</code></div><h3>{item.themeName}</h3><p>{item.statement}</p></article>)}</div></section>
        )}
      </main>
    </div>
  )
}
