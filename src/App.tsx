import { useEffect, useMemo, useState } from 'react'
import MiniSearch from 'minisearch'
import { DATA_URL, loadDataset } from './data/load'
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

const navigation: Array<{ id: View; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'rules', label: 'Rules' },
  { id: 'indicators', label: 'Indicators' },
]

function buildSearchItems(data: NormalizedDataset): SearchItem[] {
  const definitions = data.definitions.map((item) => ({
    id: item.id,
    kind: 'Definition' as const,
    title: item.term,
    body: [item.definition, item.note, ...(item.alts ?? [])].filter(Boolean).join(' '),
    meta: [item.tag, item.applicability].filter(Boolean).join(' · '),
    sourcePath: item.sourcePath,
  }))
  const rules = data.rules.map((item) => ({
    id: item.id,
    kind: 'Rule' as const,
    title: item.statement || item.id,
    body: [item.processName, item.subset, item.force, ...item.controls, ...item.artifacts].join(' '),
    meta: `${item.processId} · ${item.applicability} · ${item.force || 'Unspecified force'}`,
    sourcePath: item.sourcePath,
  }))
  const indicators = data.indicators.map((item) => ({
    id: item.id,
    kind: 'Indicator' as const,
    title: item.statement || item.id,
    body: [item.themeName, ...item.controls, ...item.artifacts].join(' '),
    meta: item.themeName,
    sourcePath: item.sourcePath,
  }))
  return [...definitions, ...rules, ...indicators]
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}

function RecordCard({ item }: { item: SearchItem }) {
  return (
    <article className="record-card">
      <div className="record-header">
        <span className={`kind kind-${item.kind.toLowerCase()}`}>{item.kind}</span>
        <code>{item.id}</code>
      </div>
      <h3>{item.title}</h3>
      <p>{item.body}</p>
      <div className="record-footer">
        <span>{item.meta}</span>
        <code>{item.sourcePath}</code>
      </div>
    </article>
  )
}

function Overview({ data }: { data: NormalizedDataset }) {
  const processes = new Set(data.rules.map((item) => item.processId)).size
  const themes = new Set(data.indicators.map((item) => item.themeId)).size
  const forceCounts = data.rules.reduce<Record<string, number>>((counts, item) => {
    const key = item.force || 'Unspecified'
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Dataset overview</span>
          <h2>{data.info.title}</h2>
          <p>{data.info.description}</p>
        </div>
        <dl className="dataset-meta">
          <div><dt>Version</dt><dd>{data.info.version}</dd></div>
          <div><dt>Last updated</dt><dd>{data.info.last_updated}</dd></div>
          <div><dt>Source</dt><dd><a href={DATA_URL} target="_blank" rel="noreferrer">Official JSON</a></dd></div>
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
        <div className="section-heading">
          <div><span className="eyebrow">Rule language</span><h2>Requirements by force</h2></div>
        </div>
        <div className="force-grid">
          {Object.entries(forceCounts).sort((a, b) => b[1] - a[1]).map(([force, count]) => (
            <div className="force-row" key={force}><span>{force}</span><strong>{count}</strong></div>
          ))}
        </div>
      </section>
    </>
  )
}

function filterDefinitions(records: DefinitionRecord[], query: string) {
  const needle = query.toLowerCase()
  return records.filter((item) => [item.id, item.term, item.definition, item.tag, ...(item.alts ?? [])].join(' ').toLowerCase().includes(needle))
}
function filterRules(records: RuleRecord[], query: string) {
  const needle = query.toLowerCase()
  return records.filter((item) => [item.id, item.processName, item.statement, item.force, item.subset, ...item.controls].join(' ').toLowerCase().includes(needle))
}
function filterIndicators(records: IndicatorRecord[], query: string) {
  const needle = query.toLowerCase()
  return records.filter((item) => [item.id, item.themeName, item.statement, ...item.controls].join(' ').toLowerCase().includes(needle))
}

export default function App() {
  const [data, setData] = useState<NormalizedDataset | null>(null)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('overview')
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadDataset().then(setData).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Unable to load the dataset.')
    })
  }, [])

  const searchItems = useMemo(() => (data ? buildSearchItems(data) : []), [data])
  const searchIndex = useMemo(() => {
    const index = new MiniSearch<SearchItem>({
      fields: ['id', 'title', 'body', 'meta'],
      storeFields: ['id', 'kind', 'title', 'body', 'meta', 'sourcePath'],
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { id: 4, title: 2 } },
    })
    index.addAll(searchItems)
    return index
  }, [searchItems])

  const globalResults = useMemo(() => {
    if (!query.trim()) return []
    return searchIndex.search(query).slice(0, 50) as unknown as SearchItem[]
  }, [query, searchIndex])

  if (error) {
    return <main className="state-screen"><h1>FedRAMP Rules Explorer</h1><p>{error}</p><button onClick={() => window.location.reload()}>Try again</button></main>
  }
  if (!data) return <main className="state-screen"><div className="loader" /><h1>Loading FedRAMP rules</h1></main>

  const localQuery = query.trim()
  const viewItems: SearchItem[] = view === 'definitions'
    ? filterDefinitions(data.definitions, localQuery).map((item) => ({ id: item.id, kind: 'Definition', title: item.term, body: item.definition, meta: [item.tag, item.applicability].filter(Boolean).join(' · '), sourcePath: item.sourcePath }))
    : view === 'rules'
      ? filterRules(data.rules, localQuery).map((item) => ({ id: item.id, kind: 'Rule', title: item.statement || item.id, body: [item.processName, item.subset, item.controls.join(', ')].filter(Boolean).join(' · '), meta: `${item.applicability} · ${item.force || 'Unspecified force'}`, sourcePath: item.sourcePath }))
      : view === 'indicators'
        ? filterIndicators(data.indicators, localQuery).map((item) => ({ id: item.id, kind: 'Indicator', title: item.statement || item.id, body: item.controls.join(', '), meta: item.themeName, sourcePath: item.sourcePath }))
        : []

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span>FR</span><div><strong>FedRAMP</strong><small>Rules Explorer</small></div></div>
        <nav>
          {navigation.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.label}</button>)}
        </nav>
        <div className="sidebar-note"><strong>Public preview</strong><span>Read-only view of the official 2026 consolidated rules.</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">FedRAMP 2026</span><h1>{navigation.find((item) => item.id === view)?.label}</h1></div>
          <label className="search-box"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, term, statement, control…" /></label>
        </header>

        {query.trim() && view === 'overview' ? (
          <section className="panel">
            <div className="section-heading"><div><span className="eyebrow">Global search</span><h2>{globalResults.length} results</h2></div><button className="text-button" onClick={() => setQuery('')}>Clear</button></div>
            <div className="records-list">{globalResults.map((item) => <RecordCard key={`${item.kind}-${item.id}`} item={item} />)}</div>
          </section>
        ) : view === 'overview' ? <Overview data={data} /> : (
          <section className="panel">
            <div className="section-heading"><div><span className="eyebrow">Browse</span><h2>{viewItems.length.toLocaleString()} {view}</h2></div></div>
            <div className="records-list">{viewItems.slice(0, 250).map((item) => <RecordCard key={`${item.kind}-${item.id}-${item.sourcePath}`} item={item} />)}</div>
            {viewItems.length > 250 && <p className="result-note">Showing the first 250 matching records. Narrow the search to see a specific item.</p>}
          </section>
        )}
      </main>
    </div>
  )
}
