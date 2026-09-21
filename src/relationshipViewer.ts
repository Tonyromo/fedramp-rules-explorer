import { loadDataset } from './data/load'
import { buildControlRelationships } from './data/relationships'
import type { NormalizedDataset, RuleRecord } from './data/types'

const NAV_ATTR = 'data-relationship-viewer-nav'
const MODE = 'relationship-viewer-mode'
const HIGHLIGHT = 'indicator-navigation-target'

type NodeKind = 'Rule' | 'Control' | 'Indicator' | 'Definition' | 'KSI Theme'
type ViewerNode = { id: string; kind: NodeKind; title: string; subtitle?: string }
type Relation = { node: ViewerNode; label: string; derived?: boolean }

let dataset: NormalizedDataset | null = null

function closeViewer(): void {
  document.querySelector('.relationship-viewer-page')?.remove()
  document.querySelector<HTMLElement>('.main-content')?.classList.remove(MODE)
  document.querySelector<HTMLButtonElement>(`[${NAV_ATTR}]`)?.classList.remove('active')
}

function sidebarButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith(label))
}

function setSearch(value: string): void {
  const input = document.querySelector<HTMLInputElement>('.search-box input')
  if (!input) return
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function highlightCard(card: HTMLElement): void {
  document.querySelectorAll(`.${HIGHLIGHT}`).forEach((item) => item.classList.remove(HIGHLIGHT))
  card.classList.add(HIGHLIGHT)
  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => card.classList.remove(HIGHLIGHT), 3000)
}

function openListTarget(nav: string, id: string, selector: string): void {
  closeViewer()
  setSearch('')
  sidebarButton(nav)?.click()
  let attempts = 0
  const locate = () => {
    attempts += 1
    const cards = Array.from(document.querySelectorAll<HTMLElement>(selector))
    const card = cards.find((item) => item.querySelector('code')?.textContent?.trim() === id)
    if (!card && attempts < 50) return void window.setTimeout(locate, 50)
    if (card) highlightCard(card)
  }
  window.setTimeout(locate, 0)
}

function openRule(id: string): void {
  closeViewer()
  sidebarButton('Rules')?.click()
  setSearch(id)
  let attempts = 0
  const locate = () => {
    attempts += 1
    const card = Array.from(document.querySelectorAll<HTMLElement>('.rule-card'))
      .find((item) => item.querySelector('.rule-card-top code')?.textContent?.trim() === id)
    const button = card?.querySelector<HTMLButtonElement>('.rule-card-open')
    if (!button && attempts < 50) return void window.setTimeout(locate, 50)
    button?.click()
  }
  window.setTimeout(locate, 0)
}

function openControl(id: string): void {
  closeViewer()
  setSearch('')
  sidebarButton('Controls')?.click()
  let attempts = 0
  const locate = () => {
    attempts += 1
    const card = Array.from(document.querySelectorAll<HTMLButtonElement>('.control-card'))
      .find((item) => item.querySelector('code')?.textContent?.trim() === id)
    if (!card && attempts < 50) return void window.setTimeout(locate, 50)
    card?.click()
  }
  window.setTimeout(locate, 0)
}

function openNode(node: ViewerNode): void {
  if (node.kind === 'Rule') return openRule(node.id)
  if (node.kind === 'Control') return openControl(node.id)
  if (node.kind === 'Definition') return openListTarget('Definitions', node.id, '.record-card')
  if (node.kind === 'Indicator') return openListTarget('Indicators', node.id, '.record-card')
  if (node.kind === 'KSI Theme') {
    closeViewer()
    document.querySelector<HTMLButtonElement>('[data-ksi-themes-nav]')?.click()
  }
}

function ruleDefinitions(rule: RuleRecord, data: NormalizedDataset) {
  const statement = rule.statement.toLowerCase()
  return data.definitions.filter((definition) =>
    rule.terms.includes(definition.id) ||
    rule.terms.some((term) => term.toLowerCase() === definition.term.toLowerCase()) ||
    (definition.term.length > 2 && statement.includes(definition.term.toLowerCase())),
  )
}

function relationsFor(node: ViewerNode, data: NormalizedDataset): Relation[] {
  const controls = buildControlRelationships(data)
  if (node.kind === 'Rule') {
    const rule = data.rules.find((item) => item.id === node.id)
    if (!rule) return []
    const direct: Relation[] = [
      ...rule.controls.map((id) => ({ node: { id, kind: 'Control' as const, title: id }, label: 'references control' })),
      ...ruleDefinitions(rule, data).map((item) => ({ node: { id: item.id, kind: 'Definition' as const, title: item.term }, label: 'uses definition' })),
      ...rule.relatedRules.map((id) => ({ node: { id, kind: 'Rule' as const, title: data.rules.find((item) => item.id === id)?.statement || id }, label: 'related rule' })),
    ]
    const indicators = data.indicators.filter((item) => item.controls.some((id) => rule.controls.includes(id)))
      .map((item) => ({ node: { id: item.id, kind: 'Indicator' as const, title: item.statement, subtitle: item.themeName }, label: 'shared control', derived: true }))
    return [...direct, ...indicators]
  }
  if (node.kind === 'Control') {
    const control = controls.find((item) => item.id === node.id)
    if (!control) return []
    return [
      ...control.rules.map((item) => ({ node: { id: item.id, kind: 'Rule' as const, title: item.statement }, label: 'referenced by rule' })),
      ...control.indicators.map((item) => ({ node: { id: item.id, kind: 'Indicator' as const, title: item.statement, subtitle: item.themeName }, label: 'referenced by indicator' })),
    ]
  }
  if (node.kind === 'Indicator') {
    const indicator = data.indicators.find((item) => item.id === node.id)
    if (!indicator) return []
    const relatedRules = data.rules.filter((rule) => rule.controls.some((id) => indicator.controls.includes(id)))
      .map((rule) => ({ node: { id: rule.id, kind: 'Rule' as const, title: rule.statement }, label: 'shared control', derived: true }))
    return [
      ...indicator.controls.map((id) => ({ node: { id, kind: 'Control' as const, title: id }, label: 'references control' })),
      { node: { id: indicator.themeId, kind: 'KSI Theme', title: indicator.themeName }, label: 'belongs to theme' },
      ...relatedRules,
    ]
  }
  if (node.kind === 'Definition') {
    const definition = data.definitions.find((item) => item.id === node.id)
    if (!definition) return []
    return data.rules.filter((rule) => ruleDefinitions(rule, data).some((item) => item.id === definition.id))
      .map((rule) => ({ node: { id: rule.id, kind: 'Rule' as const, title: rule.statement }, label: 'used by rule' }))
  }
  const indicators = data.indicators.filter((item) => item.themeId === node.id)
  return indicators.map((item) => ({ node: { id: item.id, kind: 'Indicator' as const, title: item.statement }, label: 'contains indicator' }))
}

function allNodes(data: NormalizedDataset): ViewerNode[] {
  const controls = buildControlRelationships(data)
  const themes = new Map(data.indicators.map((item) => [item.themeId, item.themeName]))
  return [
    ...data.rules.map((item) => ({ id: item.id, kind: 'Rule' as const, title: item.statement, subtitle: item.processName })),
    ...controls.map((item) => ({ id: item.id, kind: 'Control' as const, title: `${item.family} control family` })),
    ...data.indicators.map((item) => ({ id: item.id, kind: 'Indicator' as const, title: item.statement, subtitle: item.themeName })),
    ...data.definitions.map((item) => ({ id: item.id, kind: 'Definition' as const, title: item.term, subtitle: item.definition })),
    ...Array.from(themes, ([id, title]) => ({ id, kind: 'KSI Theme' as const, title })),
  ]
}

function nodeButton(node: ViewerNode, relation?: Relation): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'relationship-node'
  button.innerHTML = `<span class="relationship-node-kind">${node.kind}</span><code>${node.id}</code><strong>${node.title}</strong>${relation ? `<small>${relation.derived ? 'Derived: ' : ''}${relation.label}</small>` : ''}`
  button.addEventListener('click', () => openNode(node))
  return button
}

async function showViewer(initial?: ViewerNode): Promise<void> {
  closeViewer()
  dataset ??= (await loadDataset()).data
  const data = dataset
  const main = document.querySelector<HTMLElement>('.main-content')
  if (!main) return
  document.querySelectorAll('.sidebar nav button').forEach((item) => item.classList.remove('active'))
  document.querySelector<HTMLButtonElement>(`[${NAV_ATTR}]`)?.classList.add('active')

  const page = document.createElement('section')
  page.className = 'panel relationship-viewer-page'
  page.innerHTML = '<div class="section-heading"><div><span class="eyebrow">Explore connections</span><h2>Relationship Viewer</h2><p>Search for a rule, control, indicator, definition, or KSI theme to see its immediate relationships.</p></div></div>'

  const search = document.createElement('div')
  search.className = 'relationship-search'
  const input = document.createElement('input')
  input.type = 'search'
  input.placeholder = 'Search by ID or text...'
  input.setAttribute('aria-label', 'Search relationship viewer')
  const results = document.createElement('div')
  results.className = 'relationship-search-results'
  search.append(input, results)
  page.append(search)

  const canvas = document.createElement('div')
  canvas.className = 'relationship-canvas'
  page.append(canvas)
  const nodes = allNodes(data)

  const render = (center: ViewerNode) => {
    results.replaceChildren()
    canvas.replaceChildren()
    const relations = relationsFor(center, data)
    const direct = relations.filter((item) => !item.derived)
    const derived = relations.filter((item) => item.derived)
    const centerWrap = document.createElement('div')
    centerWrap.className = 'relationship-center'
    centerWrap.append(nodeButton(center))
    const summary = document.createElement('p')
    summary.textContent = `${direct.length} direct relationship${direct.length === 1 ? '' : 's'}${derived.length ? ` · ${derived.length} derived through shared controls` : ''}`
    centerWrap.append(summary)
    canvas.append(centerWrap)

    const groups = new Map<NodeKind, Relation[]>()
    relations.forEach((relation) => groups.set(relation.node.kind, [...(groups.get(relation.node.kind) ?? []), relation]))
    const grid = document.createElement('div')
    grid.className = 'relationship-groups'
    groups.forEach((items, kind) => {
      const group = document.createElement('section')
      group.className = 'relationship-group'
      const heading = document.createElement('h3')
      heading.textContent = `${kind}s (${items.length})`
      group.append(heading)
      const list = document.createElement('div')
      list.className = 'relationship-node-list'
      items.slice(0, 40).forEach((item) => list.append(nodeButton(item.node, item)))
      group.append(list)
      if (items.length > 40) {
        const note = document.createElement('p')
        note.className = 'relationship-limit'
        note.textContent = `Showing 40 of ${items.length} immediate relationships.`
        group.append(note)
      }
      grid.append(group)
    })
    if (!relations.length) {
      const empty = document.createElement('p')
      empty.className = 'relationship-empty'
      empty.textContent = 'No immediate relationships were found in the validated dataset.'
      grid.append(empty)
    }
    canvas.append(grid)
  }

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    results.replaceChildren()
    if (!q) return
    nodes.filter((node) => [node.id, node.kind, node.title, node.subtitle].filter(Boolean).join(' ').toLowerCase().includes(q))
      .slice(0, 12).forEach((node) => {
        const button = nodeButton(node)
        button.addEventListener('click', (event) => { event.stopImmediatePropagation(); input.value = `${node.id} — ${node.title}`; render(node) })
        results.append(button)
      })
  })

  main.classList.add(MODE)
  main.append(page)
  if (initial) render(initial)
}

function addNav(): void {
  const nav = document.querySelector<HTMLElement>('.sidebar nav')
  if (!nav || nav.querySelector(`[${NAV_ATTR}]`)) return
  const controls = sidebarButton('Controls')
  if (!controls) return
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Relationship Viewer'
  button.setAttribute(NAV_ATTR, 'true')
  button.addEventListener('click', () => void showViewer())
  controls.insertAdjacentElement('afterend', button)

  nav.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null
    if (target && !target.hasAttribute(NAV_ATTR)) closeViewer()
  }, true)
}

export function installRelationshipViewer(): void {
  addNav()
  new MutationObserver(addNav).observe(document.body, { childList: true, subtree: true })
}
