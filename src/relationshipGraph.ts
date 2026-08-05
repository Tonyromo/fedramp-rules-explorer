type GraphNode = {
  id: string
  label: string
  kind: 'control' | 'rule' | 'indicator' | 'process'
  target?: HTMLElement
  x: number
  y: number
}

type GraphEdge = { source: GraphNode; target: GraphNode }

const SVG_NS = 'http://www.w3.org/2000/svg'
const GRAPH_MARKER = 'data-spider-graph-ready'
const INDICATOR_ROW_MARKER = 'data-indicator-navigation-ready'

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string> = {}) {
  const element = document.createElementNS(SVG_NS, name)
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value))
  return element
}

function distribute(nodes: GraphNode[], centerX: number, centerY: number, radius: number, startAngle: number) {
  nodes.forEach((node, index) => {
    const angle = startAngle + (Math.PI * 2 * index) / Math.max(nodes.length, 1)
    node.x = centerX + Math.cos(angle) * radius
    node.y = centerY + Math.sin(angle) * radius
  })
}

function findSidebarButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith(label))
}

function findIndicatorCard(indicatorId: string) {
  return Array.from(document.querySelectorAll<HTMLElement>('.record-card'))
    .find((card) => card.querySelector('code')?.textContent?.trim() === indicatorId)
}

function navigateToIndicator(indicatorId: string) {
  findSidebarButton('Indicators')?.click()

  let attempts = 0
  const locate = () => {
    const card = findIndicatorCard(indicatorId)
    if (card) {
      document.querySelectorAll('.indicator-navigation-target').forEach((item) => item.classList.remove('indicator-navigation-target'))
      card.classList.add('indicator-navigation-target')
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => card.classList.remove('indicator-navigation-target'), 2600)
      return
    }
    attempts += 1
    if (attempts < 20) window.setTimeout(locate, 50)
  }
  window.setTimeout(locate, 0)
}

function readControlDetail(detail: HTMLElement) {
  const heading = detail.querySelector('.detail-header h2')?.textContent?.trim()
  if (!heading) return null

  const sections = Array.from(detail.querySelectorAll<HTMLElement>('.detail-section'))
  const sectionByTitle = (title: string) => sections.find((section) => section.querySelector('h3')?.textContent?.trim() === title)

  const ruleSection = sectionByTitle('Referenced rules')
  const indicatorSection = sectionByTitle('Referenced indicators')
  const processSection = sectionByTitle('Processes')
  if (!ruleSection || !indicatorSection || !processSection) return null

  const rules = Array.from(ruleSection.querySelectorAll<HTMLElement>('.relationship-list > button')).map((target) => ({
    id: target.querySelector('code')?.textContent?.trim() ?? 'Rule',
    label: target.querySelector('code')?.textContent?.trim() ?? 'Rule',
    kind: 'rule' as const,
    target,
    x: 0,
    y: 0,
  }))

  const indicators = Array.from(indicatorSection.querySelectorAll<HTMLElement>('.relationship-list > article')).map((target) => ({
    id: target.querySelector('code')?.textContent?.trim() ?? 'Indicator',
    label: target.querySelector('code')?.textContent?.trim() ?? 'Indicator',
    kind: 'indicator' as const,
    target,
    x: 0,
    y: 0,
  }))

  const processes = Array.from(processSection.querySelectorAll<HTMLElement>('.chip-list > span')).map((target) => ({
    id: target.textContent?.trim() ?? 'Process',
    label: target.textContent?.trim() ?? 'Process',
    kind: 'process' as const,
    x: 0,
    y: 0,
  }))

  return { heading, rules, indicators, processes, ruleSection, indicatorSection, processSection }
}

function makeRelationshipTable(section: HTMLElement, kind: 'rules' | 'indicators') {
  const list = section.querySelector<HTMLElement>('.relationship-list')
  if (!list || list.classList.contains('relationship-table')) return

  list.classList.add('relationship-table')
  const header = document.createElement('div')
  header.className = 'relationship-table-header'
  header.innerHTML = kind === 'rules'
    ? '<span>Rule</span><span>Statement</span><span>Process / force</span>'
    : '<span>Indicator</span><span>Statement</span><span>Theme</span>'
  list.prepend(header)

  Array.from(list.querySelectorAll<HTMLElement>(':scope > button, :scope > article')).forEach((row) => {
    row.classList.add('relationship-table-row')
  })
}

function makeIndicatorsInteractive(indicators: GraphNode[]) {
  indicators.forEach((indicator) => {
    const row = indicator.target
    if (!row || row.hasAttribute(INDICATOR_ROW_MARKER)) return
    row.setAttribute(INDICATOR_ROW_MARKER, 'true')
    row.setAttribute('role', 'button')
    row.setAttribute('tabindex', '0')
    row.setAttribute('aria-label', `Open indicator ${indicator.id}`)
    const open = () => navigateToIndicator(indicator.id)
    row.addEventListener('click', open)
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    })
  })
}

function renderGraph(detail: HTMLElement) {
  if (detail.hasAttribute(GRAPH_MARKER)) return
  const relationship = readControlDetail(detail)
  if (!relationship) return
  detail.setAttribute(GRAPH_MARKER, 'true')

  makeRelationshipTable(relationship.ruleSection, 'rules')
  makeRelationshipTable(relationship.indicatorSection, 'indicators')
  makeIndicatorsInteractive(relationship.indicators)

  const tabContainer = document.createElement('section')
  tabContainer.className = 'detail-section relationship-tabs'
  tabContainer.innerHTML = `
    <div class="relationship-tabs-nav" role="tablist" aria-label="Control relationships">
      <button class="relationship-tab active" type="button" role="tab" aria-selected="true" aria-controls="relationship-viewer-panel">Relationship Viewer</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="referenced-indicators-panel">Referenced Indicators</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="referenced-rules-panel">Referenced Rules</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="processes-panel">Processes</button>
    </div>
    <div class="relationship-tab-content">
      <div class="relationship-tab-panel active" role="tabpanel" id="relationship-viewer-panel"></div>
      <div class="relationship-tab-panel" role="tabpanel" id="referenced-indicators-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="referenced-rules-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="processes-panel" hidden></div>
    </div>
  `

  const summary = detail.querySelector('.relationship-summary')
  summary?.insertAdjacentElement('afterend', tabContainer)

  const graphPanel = tabContainer.querySelector<HTMLElement>('#relationship-viewer-panel')!
  const indicatorsPanel = tabContainer.querySelector<HTMLElement>('#referenced-indicators-panel')!
  const rulesPanel = tabContainer.querySelector<HTMLElement>('#referenced-rules-panel')!
  const processesPanel = tabContainer.querySelector<HTMLElement>('#processes-panel')!
  indicatorsPanel.append(relationship.indicatorSection)
  rulesPanel.append(relationship.ruleSection)
  processesPanel.append(relationship.processSection)

  const graphSection = document.createElement('div')
  graphSection.className = 'spider-graph-section'
  graphSection.innerHTML = `
    <div class="spider-graph-heading">
      <div><h3>Relationship viewer</h3><p>Drag to pan, scroll to zoom, and select a rule or indicator node to open it.</p></div>
      <div class="spider-graph-actions">
        <button class="secondary-button" type="button" data-action="fit">Fit to view</button>
        <button class="secondary-button" type="button" data-action="toggle">Hide graph</button>
      </div>
    </div>
    <div class="spider-legend">
      <span class="legend-control">Control</span><span class="legend-rule">Rules</span><span class="legend-indicator">Indicators</span><span class="legend-process">Processes</span>
    </div>
    <div class="spider-graph-viewport"></div>
  `
  graphPanel.append(graphSection)

  const tabs = Array.from(tabContainer.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
  const panels = Array.from(tabContainer.querySelectorAll<HTMLElement>('.relationship-tab-panel'))
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => {
        const active = item === tab
        item.classList.toggle('active', active)
        item.setAttribute('aria-selected', String(active))
      })
      panels.forEach((panel) => {
        const active = panel.id === tab.getAttribute('aria-controls')
        panel.classList.toggle('active', active)
        panel.hidden = !active
      })
    })
  })

  const viewport = graphSection.querySelector<HTMLElement>('.spider-graph-viewport')!
  const svg = svgElement('svg', { viewBox: '0 0 1100 700', role: 'img', 'aria-label': `Relationship graph for ${relationship.heading}` })
  const scene = svgElement('g')
  svg.append(scene)
  viewport.append(svg)

  const center: GraphNode = { id: relationship.heading, label: relationship.heading, kind: 'control', x: 550, y: 350 }
  distribute(relationship.rules, 280, 250, Math.min(190, 75 + relationship.rules.length * 7), -Math.PI / 2)
  distribute(relationship.indicators, 820, 245, Math.min(170, 80 + relationship.indicators.length * 9), -Math.PI / 2)
  distribute(relationship.processes, 720, 535, Math.min(125, 70 + relationship.processes.length * 12), Math.PI / 2)

  const nodes = [center, ...relationship.rules, ...relationship.indicators, ...relationship.processes]
  const edges: GraphEdge[] = nodes.slice(1).map((node) => ({ source: center, target: node }))

  edges.forEach(({ source, target }) => {
    scene.append(svgElement('line', {
      x1: String(source.x), y1: String(source.y), x2: String(target.x), y2: String(target.y), class: `spider-edge edge-${target.kind}`,
    }))
  })

  nodes.forEach((node) => {
    const group = svgElement('g', { class: `spider-node node-${node.kind}`, tabindex: node.target ? '0' : '-1', transform: `translate(${node.x} ${node.y})` })
    group.setAttribute('data-node-id', node.id)
    const radius = node.kind === 'control' ? 62 : node.kind === 'process' ? 32 : 27
    group.append(svgElement('circle', { r: String(radius) }))
    const label = svgElement('text', { 'text-anchor': 'middle', y: node.kind === 'control' ? '5' : '4' })
    label.textContent = node.label.length > 17 ? `${node.label.slice(0, 15)}…` : node.label
    group.append(label)
    if (node.kind === 'control') {
      const subtitle = svgElement('text', { 'text-anchor': 'middle', y: '25', class: 'node-subtitle' })
      subtitle.textContent = 'Control'
      group.append(subtitle)
    }
    if (node.target) {
      group.classList.add('clickable')
      const open = () => {
        if (node.kind === 'indicator') {
          group.dispatchEvent(new CustomEvent('relationship-indicator-select', {
            bubbles: true,
            composed: true,
            detail: { id: node.id },
          }))
          return
        }
        node.target?.click()
      }
      group.addEventListener('click', (event) => {
        event.stopPropagation()
        open()
      })
      group.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          open()
        }
      })
    }
    scene.append(group)
  })

  let scale = 1
  let translateX = 0
  let translateY = 0
  let dragging = false
  let startX = 0
  let startY = 0

  const applyTransform = () => scene.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`)
  const centerOnControl = () => {
    translateX = center.x * (1 - scale)
    translateY = center.y * (1 - scale)
  }
  const fit = () => { scale = 1; centerOnControl(); applyTransform() }

  svg.addEventListener('wheel', (event) => {
    event.preventDefault()
    scale = Math.min(2.5, Math.max(0.55, scale * (event.deltaY < 0 ? 1.1 : 0.9)))
    centerOnControl()
    applyTransform()
  }, { passive: false })
  svg.addEventListener('pointerdown', (event) => { dragging = true; startX = event.clientX - translateX; startY = event.clientY - translateY; svg.setPointerCapture(event.pointerId) })
  svg.addEventListener('pointermove', (event) => { if (!dragging) return; translateX = event.clientX - startX; translateY = event.clientY - startY; applyTransform() })
  svg.addEventListener('pointerup', () => { dragging = false })
  svg.addEventListener('pointercancel', () => { dragging = false })

  graphSection.querySelector<HTMLButtonElement>('[data-action="fit"]')?.addEventListener('click', fit)
  graphSection.querySelector<HTMLButtonElement>('[data-action="toggle"]')?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const hidden = viewport.hidden
    viewport.hidden = !hidden
    graphSection.querySelector<HTMLElement>('.spider-legend')!.hidden = !hidden
    button.textContent = hidden ? 'Hide graph' : 'Show graph'
  })
}

function enhance() {
  document.querySelectorAll<HTMLElement>('.detail-page').forEach(renderGraph)
}

const observer = new MutationObserver(enhance)
observer.observe(document.documentElement, { childList: true, subtree: true })
queueMicrotask(enhance)
