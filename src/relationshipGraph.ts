type GraphNode = {
  id: string
  label: string
  kind: 'control' | 'rule' | 'indicator' | 'process'
  target?: HTMLElement
  x: number
  y: number
  parentId?: string
  expanded?: boolean
}

type GraphEdge = { source: GraphNode; target: GraphNode }
type LayoutMode = 'radial' | 'hierarchical' | 'tree' | 'force'

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
      <div><h3>Relationship viewer</h3><p>Drag to pan, scroll to zoom, select any node to inspect it, or expand neighbours.</p></div>
      <div class="spider-graph-actions">
        <label class="relationship-layout-control">Layout
          <select data-action="layout" aria-label="Relationship graph layout">
            <option value="radial">Radial</option>
            <option value="hierarchical">Hierarchical</option>
            <option value="tree">Tree</option>
            <option value="force">Force</option>
          </select>
        </label>
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

  const minimap = document.createElement('div')
  minimap.className = 'spider-minimap'
  minimap.setAttribute('aria-label', 'Relationship graph mini-map')
  const minimapSvg = svgElement('svg', { viewBox: '0 0 1100 700', role: 'img', 'aria-label': `Mini-map for ${relationship.heading}` })
  const minimapScene = svgElement('g')
  const minimapViewport = svgElement('rect', { class: 'spider-minimap-viewport', x: '0', y: '0', width: '1100', height: '700' })
  minimapSvg.append(minimapScene, minimapViewport)
  minimap.append(minimapSvg)
  viewport.append(minimap)

  const center: GraphNode = { id: relationship.heading, label: relationship.heading, kind: 'control', x: 550, y: 350 }
  const baseNodes = [center, ...relationship.rules, ...relationship.indicators, ...relationship.processes]
  const expandedNodes: GraphNode[] = []
  const nodes = [...baseNodes]
  const edges: GraphEdge[] = baseNodes.slice(1).map((node) => ({ source: center, target: node }))
  const edgeElements = new Map<string, SVGLineElement>()
  const nodeElements = new Map<string, SVGGElement>()
  const minimapEdges = new Map<string, SVGLineElement>()
  const minimapNodes = new Map<string, SVGCircleElement>()
  let currentLayout: LayoutMode = 'radial'

  let scale = 1
  let translateX = 0
  let translateY = 0
  let dragging = false
  let startX = 0
  let startY = 0

  const updateMinimapViewport = () => {
    const x = -translateX / scale
    const y = -translateY / scale
    minimapViewport.setAttribute('x', String(x))
    minimapViewport.setAttribute('y', String(y))
    minimapViewport.setAttribute('width', String(1100 / scale))
    minimapViewport.setAttribute('height', String(700 / scale))
  }

  const applyTransform = () => {
    scene.setAttribute('transform', `translate(${translateX} ${translateY}) scale(${scale})`)
    updateMinimapViewport()
  }

  const centerOnControl = () => {
    translateX = center.x * (1 - scale)
    translateY = center.y * (1 - scale)
  }

  const fit = () => {
    scale = 1
    centerOnControl()
    applyTransform()
  }

  const nodeById = (id: string) => nodes.find((item) => item.id === id)

  const clearHighlight = () => {
    scene.classList.remove('has-highlight')
    nodeElements.forEach((element) => element.classList.remove('is-highlighted', 'is-connected', 'is-dimmed'))
    edgeElements.forEach((element) => element.classList.remove('is-highlighted', 'is-dimmed'))
  }

  const highlightNode = (node: GraphNode) => {
    clearHighlight()
    scene.classList.add('has-highlight')

    const connectedIds = new Set<string>([node.id])
    edges.forEach((edge) => {
      if (edge.source.id === node.id) connectedIds.add(edge.target.id)
      if (edge.target.id === node.id) connectedIds.add(edge.source.id)
    })

    nodeElements.forEach((element, id) => {
      if (id === node.id) element.classList.add('is-highlighted')
      else if (connectedIds.has(id)) element.classList.add('is-connected')
      else element.classList.add('is-dimmed')
    })

    edgeElements.forEach((element) => {
      const sourceId = element.getAttribute('data-source-id')
      const targetId = element.getAttribute('data-target-id')
      const connected = sourceId === node.id || targetId === node.id
      element.classList.add(connected ? 'is-highlighted' : 'is-dimmed')
    })
  }

  const syncPositions = () => {
    nodeElements.forEach((element, id) => {
      const node = nodeById(id)
      if (node) element.setAttribute('transform', `translate(${node.x} ${node.y})`)
    })
    minimapNodes.forEach((element, id) => {
      const node = nodeById(id)
      if (!node) return
      element.setAttribute('cx', String(node.x))
      element.setAttribute('cy', String(node.y))
    })
    edgeElements.forEach((element, key) => {
      const edge = edges.find((item) => `${item.source.id}->${item.target.id}` === key)
      if (!edge) return
      element.setAttribute('x1', String(edge.source.x))
      element.setAttribute('y1', String(edge.source.y))
      element.setAttribute('x2', String(edge.target.x))
      element.setAttribute('y2', String(edge.target.y))
    })
    minimapEdges.forEach((element, key) => {
      const edge = edges.find((item) => `${item.source.id}->${item.target.id}` === key)
      if (!edge) return
      element.setAttribute('x1', String(edge.source.x))
      element.setAttribute('y1', String(edge.source.y))
      element.setAttribute('x2', String(edge.target.x))
      element.setAttribute('y2', String(edge.target.y))
    })
  }

  const positionExpandedNodes = () => {
    const grouped = new Map<string, GraphNode[]>()
    expandedNodes.forEach((node) => {
      if (!node.parentId) return
      const list = grouped.get(node.parentId) ?? []
      list.push(node)
      grouped.set(node.parentId, list)
    })

    grouped.forEach((children, parentId) => {
      const parent = nodeById(parentId)
      if (!parent) return
      const baseAngle = Math.atan2(parent.y - center.y, parent.x - center.x)
      children.forEach((child, index) => {
        const spread = Math.PI / 2
        const offset = children.length === 1 ? 0 : -spread / 2 + (spread * index) / (children.length - 1)
        const radius = 105 + (index % 2) * 18
        child.x = parent.x + Math.cos(baseAngle + offset) * radius
        child.y = parent.y + Math.sin(baseAngle + offset) * radius
      })
    })
  }

  const applyLayout = (layout: LayoutMode) => {
    currentLayout = layout
    if (layout === 'radial') {
      center.x = 550
      center.y = 350
      distribute(relationship.rules, 280, 250, Math.min(190, 75 + relationship.rules.length * 7), -Math.PI / 2)
      distribute(relationship.indicators, 820, 245, Math.min(170, 80 + relationship.indicators.length * 9), -Math.PI / 2)
      distribute(relationship.processes, 720, 535, Math.min(125, 70 + relationship.processes.length * 12), Math.PI / 2)
    } else if (layout === 'hierarchical') {
      center.x = 550
      center.y = 100
      const groups = [relationship.rules, relationship.indicators, relationship.processes]
      const yPositions = [270, 430, 580]
      groups.forEach((group, groupIndex) => {
        group.forEach((node, index) => {
          const spacing = 900 / Math.max(group.length, 1)
          node.x = 100 + spacing / 2 + index * spacing
          node.y = yPositions[groupIndex]
        })
      })
    } else if (layout === 'tree') {
      center.x = 160
      center.y = 350
      const groups = [relationship.rules, relationship.indicators, relationship.processes]
      const xPositions = [430, 720, 960]
      groups.forEach((group, groupIndex) => {
        group.forEach((node, index) => {
          const spacing = 560 / Math.max(group.length, 1)
          node.x = xPositions[groupIndex]
          node.y = 70 + spacing / 2 + index * spacing
        })
      })
    } else {
      center.x = 550
      center.y = 350
      const all = [...relationship.rules, ...relationship.indicators, ...relationship.processes]
      all.forEach((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(all.length, 1)
        const kindOffset = node.kind === 'rule' ? -40 : node.kind === 'indicator' ? 30 : 85
        const radius = 180 + (index % 4) * 48 + kindOffset
        node.x = 550 + Math.cos(angle) * radius
        node.y = 350 + Math.sin(angle) * radius * 0.78
      })
    }
    positionExpandedNodes()
    syncPositions()
  }

  const createEdge = (source: GraphNode, target: GraphNode) => {
    const key = `${source.id}->${target.id}`
    if (edgeElements.has(key)) return
    edges.push({ source, target })

    const edge = svgElement('line', {
      x1: String(source.x), y1: String(source.y), x2: String(target.x), y2: String(target.y), class: `spider-edge edge-${target.kind}`,
    })
    edge.setAttribute('data-source-id', source.id)
    edge.setAttribute('data-target-id', target.id)
    edgeElements.set(key, edge)
    scene.insertBefore(edge, scene.firstChild)

    const minimapEdge = svgElement('line', {
      x1: String(source.x), y1: String(source.y), x2: String(target.x), y2: String(target.y), class: `spider-minimap-edge minimap-edge-${target.kind}`,
    })
    minimapEdges.set(key, minimapEdge)
    minimapScene.insertBefore(minimapEdge, minimapScene.firstChild)
  }

  const removeExpandedChildren = (parentId: string) => {
    const ids = expandedNodes.filter((node) => node.parentId === parentId).map((node) => node.id)
    ids.forEach((id) => {
      nodeElements.get(id)?.remove()
      minimapNodes.get(id)?.remove()
      nodeElements.delete(id)
      minimapNodes.delete(id)
      const nodeIndex = nodes.findIndex((node) => node.id === id)
      if (nodeIndex >= 0) nodes.splice(nodeIndex, 1)
      const expandedIndex = expandedNodes.findIndex((node) => node.id === id)
      if (expandedIndex >= 0) expandedNodes.splice(expandedIndex, 1)
    })

    for (let index = edges.length - 1; index >= 0; index -= 1) {
      const edge = edges[index]
      if (!ids.includes(edge.target.id)) continue
      const key = `${edge.source.id}->${edge.target.id}`
      edgeElements.get(key)?.remove()
      minimapEdges.get(key)?.remove()
      edgeElements.delete(key)
      minimapEdges.delete(key)
      edges.splice(index, 1)
    }
  }

  const createNodeElement = (node: GraphNode) => {
    const group = svgElement('g', { class: `spider-node node-${node.kind}`, tabindex: '0', transform: `translate(${node.x} ${node.y})` })
    group.setAttribute('data-node-id', node.id)
    if (node.parentId) group.classList.add('expanded-neighbour')
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

    if (node.kind !== 'control') {
      const expandBadge = svgElement('g', { class: 'spider-node-expand', role: 'button', tabindex: '0', 'aria-label': `${node.expanded ? 'Collapse' : 'Expand'} neighbours for ${node.id}` })
      expandBadge.setAttribute('transform', 'translate(20 -20)')
      expandBadge.append(svgElement('circle', { r: '10' }))
      const plus = svgElement('text', { 'text-anchor': 'middle', y: '4' })
      plus.textContent = node.expanded ? '−' : '+'
      expandBadge.append(plus)
      group.append(expandBadge)
    }

    nodeElements.set(node.id, group)
    group.addEventListener('pointerenter', () => highlightNode(node))
    group.addEventListener('pointerleave', clearHighlight)
    group.addEventListener('focus', () => highlightNode(node))
    group.addEventListener('blur', clearHighlight)
    if (node.target) group.classList.add('clickable')
    scene.append(group)

    const minimapNode = svgElement('circle', {
      cx: String(node.x),
      cy: String(node.y),
      r: node.kind === 'control' ? '34' : node.kind === 'process' ? '15' : '13',
      class: `spider-minimap-node minimap-node-${node.kind}`,
    })
    minimapNodes.set(node.id, minimapNode)
    minimapScene.append(minimapNode)
  }

  const neighbourCandidates = (node: GraphNode) => {
    if (node.kind === 'rule') return relationship.processes.slice(0, 3)
    if (node.kind === 'indicator') return relationship.rules.slice(0, 3)
    if (node.kind === 'process') return relationship.rules.filter((item) => item.target?.textContent?.includes(node.id)).slice(0, 3)
    return []
  }

  const toggleNeighbours = (node: GraphNode) => {
    if (node.expanded) {
      removeExpandedChildren(node.id)
      node.expanded = false
    } else {
      const candidates = neighbourCandidates(node)
      candidates.forEach((candidate, index) => {
        const id = `${node.id}::${candidate.id}::${index}`
        if (nodeById(id)) return
        const child: GraphNode = {
          id,
          label: candidate.label,
          kind: candidate.kind,
          target: candidate.target,
          x: node.x,
          y: node.y,
          parentId: node.id,
        }
        expandedNodes.push(child)
        nodes.push(child)
        createNodeElement(child)
        createEdge(node, child)
      })
      node.expanded = true
    }

    const nodeElement = nodeElements.get(node.id)
    const badgeText = nodeElement?.querySelector<SVGTextElement>('.spider-node-expand text')
    const badge = nodeElement?.querySelector<SVGGElement>('.spider-node-expand')
    if (badgeText) badgeText.textContent = node.expanded ? '−' : '+'
    badge?.setAttribute('aria-label', `${node.expanded ? 'Collapse' : 'Expand'} neighbours for ${node.id}`)
    applyLayout(currentLayout)
  }

  baseNodes.forEach((node) => createNodeElement(node))
  baseNodes.slice(1).forEach((node) => createEdge(center, node))

  scene.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null
    const badge = target?.closest<SVGGElement>('.spider-node-expand')
    if (!badge) return
    event.preventDefault()
    event.stopPropagation()
    const group = badge.closest<SVGGElement>('.spider-node')
    const node = group ? nodeById(group.getAttribute('data-node-id') ?? '') : undefined
    if (node) toggleNeighbours(node)
  })

  scene.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const target = event.target instanceof Element ? event.target : null
    const badge = target?.closest<SVGGElement>('.spider-node-expand')
    if (!badge) return
    event.preventDefault()
    event.stopPropagation()
    const group = badge.closest<SVGGElement>('.spider-node')
    const node = group ? nodeById(group.getAttribute('data-node-id') ?? '') : undefined
    if (node) toggleNeighbours(node)
  })

  applyLayout('radial')
  applyTransform()

  svg.addEventListener('wheel', (event) => {
    event.preventDefault()
    scale = Math.min(2.5, Math.max(0.55, scale * (event.deltaY < 0 ? 1.1 : 0.9)))
    centerOnControl()
    applyTransform()
  }, { passive: false })
  svg.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('.spider-node.clickable') || target?.closest('.spider-node-expand')) return
    dragging = true
    startX = event.clientX - translateX
    startY = event.clientY - translateY
    svg.setPointerCapture(event.pointerId)
  })
  svg.addEventListener('pointermove', (event) => {
    if (!dragging) return
    translateX = event.clientX - startX
    translateY = event.clientY - startY
    applyTransform()
  })
  svg.addEventListener('pointerup', (event) => {
    if (!dragging) return
    dragging = false
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
  })
  svg.addEventListener('pointercancel', (event) => {
    dragging = false
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId)
  })
  svg.addEventListener('pointerleave', () => {
    if (!dragging) clearHighlight()
  })

  minimapSvg.addEventListener('click', (event) => {
    const rect = minimapSvg.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 1100
    const y = ((event.clientY - rect.top) / rect.height) * 700
    translateX = 550 - x * scale
    translateY = 350 - y * scale
    applyTransform()
  })

  graphSection.querySelector<HTMLSelectElement>('[data-action="layout"]')?.addEventListener('change', (event) => {
    applyLayout((event.currentTarget as HTMLSelectElement).value as LayoutMode)
    fit()
  })
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
