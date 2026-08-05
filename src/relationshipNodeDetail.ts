const RETURN_CONTEXT_KEY = 'fedramp-rules-explorer:return-control'
const CARD_CLASS = 'relationship-node-card'
const NODE_BOUND = 'data-relationship-detail-bound'
const BREADCRUMB_CLASS = 'relationship-breadcrumbs'

type NodeKind = 'control' | 'rule' | 'indicator' | 'process'

type NodeDetails = {
  id: string
  kind: NodeKind
  typeLabel: string
  summary: string
  relationshipLabel: string
  relationshipExplanation: string
  reasoningSource: string
  reasoningEvidence: string
  actionLabel?: string
  action?: () => void
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function sidebarButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith(label))
}

function findIndicatorRow(detail: HTMLElement, id: string) {
  return Array.from(detail.querySelectorAll<HTMLElement>('#referenced-indicators-panel .relationship-table-row'))
    .find((row) => row.querySelector('code')?.textContent?.trim() === id)
}

function findRuleRow(detail: HTMLElement, id: string) {
  return Array.from(detail.querySelectorAll<HTMLElement>('#referenced-rules-panel .relationship-table-row'))
    .find((row) => row.querySelector('code')?.textContent?.trim() === id)
}

function removeCard(viewport?: HTMLElement) {
  (viewport ?? document).querySelector<HTMLElement>(`.${CARD_CLASS}`)?.remove()
}

function getControlId(detail: HTMLElement) {
  return detail.querySelector('.detail-header h2')?.textContent?.trim() || 'Control'
}

function activateRelationshipViewer(detail: HTMLElement) {
  const viewerTab = Array.from(detail.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
    .find((button) => button.textContent?.trim() === 'Relationship Viewer')
  viewerTab?.click()
}

function addBreadcrumbs(detail: HTMLElement) {
  if (detail.querySelector(`.${BREADCRUMB_CLASS}`)) return

  const tabContainer = detail.querySelector<HTMLElement>('.relationship-tabs')
  if (!tabContainer) return

  const controlId = getControlId(detail)
  const breadcrumbs = document.createElement('nav')
  breadcrumbs.className = BREADCRUMB_CLASS
  breadcrumbs.setAttribute('aria-label', 'Relationship navigation')
  breadcrumbs.innerHTML = `
    <button type="button" data-breadcrumb="controls">Controls</button>
    <span aria-hidden="true">›</span>
    <button type="button" data-breadcrumb="control">${escapeHtml(controlId)}</button>
    <span aria-hidden="true">›</span>
    <span aria-current="page">Relationship Viewer</span>
  `

  breadcrumbs.querySelector<HTMLButtonElement>('[data-breadcrumb="controls"]')?.addEventListener('click', () => {
    sidebarButton('Controls')?.click()
  })

  breadcrumbs.querySelector<HTMLButtonElement>('[data-breadcrumb="control"]')?.addEventListener('click', () => {
    activateRelationshipViewer(detail)
    detail.querySelector('.detail-header')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  tabContainer.prepend(breadcrumbs)
}

function openIndicatorPage(id: string, controlId: string) {
  sessionStorage.setItem(RETURN_CONTEXT_KEY, controlId)
  sidebarButton('Indicators')?.click()

  let attempts = 0
  const locate = () => {
    attempts += 1
    const card = Array.from(document.querySelectorAll<HTMLElement>('.record-card'))
      .find((item) => item.querySelector('code')?.textContent?.trim() === id)

    if (!card && attempts < 30) {
      window.setTimeout(locate, 50)
      return
    }

    if (!card) return
    card.classList.add('indicator-navigation-target')
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => card.classList.remove('indicator-navigation-target'), 2600)
    addReturnButton()
  }

  window.setTimeout(locate, 0)
}

function readNodeDetails(node: SVGGElement): NodeDetails | null {
  const detail = node.closest<HTMLElement>('.detail-page')
  if (!detail) return null

  const id = node.getAttribute('data-node-id') || node.querySelector('text')?.textContent?.trim() || ''
  if (!id) return null

  const controlId = getControlId(detail)

  if (node.classList.contains('node-indicator')) {
    const row = findIndicatorRow(detail, id)
    const statement = row?.querySelector('span')?.textContent?.trim() || 'No statement supplied.'
    const theme = row?.querySelector('small')?.textContent?.trim() || 'Key Security Indicator'
    return {
      id,
      kind: 'indicator',
      typeLabel: theme,
      summary: statement,
      relationshipLabel: 'Control references indicator',
      relationshipExplanation: `${controlId} and ${id} are connected because the official indicator mapping lists this control.`,
      reasoningSource: 'Official indicator control mapping',
      reasoningEvidence: statement,
      actionLabel: 'Open indicator',
      action: () => openIndicatorPage(id, controlId),
    }
  }

  if (node.classList.contains('node-rule')) {
    const row = findRuleRow(detail, id)
    const statement = row?.querySelector('span')?.textContent?.trim() || 'No rule statement supplied.'
    const mapping = row?.querySelector('small')?.textContent?.trim() || 'No process or force supplied.'
    const target = Array.from(detail.querySelectorAll<HTMLButtonElement>('#referenced-rules-panel .relationship-table-row'))
      .find((item) => item.querySelector('code')?.textContent?.trim() === id)
    return {
      id,
      kind: 'rule',
      typeLabel: 'Referenced rule',
      summary: statement,
      relationshipLabel: 'Control referenced by rule',
      relationshipExplanation: `${controlId} and ${id} are connected because the official rule mapping explicitly includes this control.`,
      reasoningSource: `Official rule control mapping · ${mapping}`,
      reasoningEvidence: statement,
      actionLabel: target ? 'Open rule' : undefined,
      action: target ? () => target.click() : undefined,
    }
  }

  if (node.classList.contains('node-process')) {
    const mappedRules = Array.from(detail.querySelectorAll<HTMLElement>('#referenced-rules-panel .relationship-table-row'))
      .filter((row) => row.querySelector('small')?.textContent?.includes(id))
      .map((row) => row.querySelector('code')?.textContent?.trim())
      .filter((value): value is string => Boolean(value))
    const evidence = mappedRules.length
      ? `${mappedRules.slice(0, 4).join(', ')}${mappedRules.length > 4 ? ` and ${mappedRules.length - 4} more` : ''}`
      : 'Process listed in the control relationship data.'
    return {
      id,
      kind: 'process',
      typeLabel: 'Process',
      summary: `This process is associated with ${controlId}.`,
      relationshipLabel: 'Derived from mapped rules',
      relationshipExplanation: `${id} appears because one or more rules mapped to ${controlId} belong to this process.`,
      reasoningSource: 'Official rule process and control mappings',
      reasoningEvidence: evidence,
    }
  }

  if (node.classList.contains('node-control')) {
    const ruleCount = detail.querySelectorAll('#referenced-rules-panel .relationship-table-row').length
    const indicatorCount = detail.querySelectorAll('#referenced-indicators-panel .relationship-table-row').length
    const processCount = detail.querySelectorAll('#processes-panel .chip-list > span').length
    return {
      id,
      kind: 'control',
      typeLabel: 'Control',
      summary: 'Central control for the relationships shown in this viewer.',
      relationshipLabel: 'Relationship hub',
      relationshipExplanation: `${controlId} is the selected control. Every displayed edge is calculated from the current validated FedRAMP mappings.`,
      reasoningSource: 'Current validated FedRAMP dataset',
      reasoningEvidence: `${ruleCount} rule mapping${ruleCount === 1 ? '' : 's'}, ${indicatorCount} indicator mapping${indicatorCount === 1 ? '' : 's'}, and ${processCount} process${processCount === 1 ? '' : 'es'}.`,
    }
  }

  return null
}

function showNodeCard(node: SVGGElement, focusAction = false) {
  const viewport = node.closest<HTMLElement>('.spider-graph-viewport')
  if (!viewport) return

  const details = readNodeDetails(node)
  if (!details) return

  removeCard(viewport)

  const card = document.createElement('section')
  card.className = `${CARD_CLASS} relationship-node-card-${details.kind}`
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-label', `${details.typeLabel} ${details.id}`)
  card.innerHTML = `
    <button type="button" class="relationship-node-card-close" aria-label="Close ${escapeHtml(details.typeLabel.toLowerCase())} details">×</button>
    <span class="relationship-node-card-type">${escapeHtml(details.typeLabel)}</span>
    <h4>${escapeHtml(details.id)}</h4>
    <p>${escapeHtml(details.summary)}</p>
    <div class="relationship-node-card-explanation">
      <span>${escapeHtml(details.relationshipLabel)}</span>
      <p>${escapeHtml(details.relationshipExplanation)}</p>
    </div>
    <div class="relationship-node-card-reasoning">
      <div><span>Reasoning source</span><p>${escapeHtml(details.reasoningSource)}</p></div>
      <div><span>Supporting evidence</span><p>${escapeHtml(details.reasoningEvidence)}</p></div>
    </div>
    ${details.actionLabel ? `
      <div class="relationship-node-card-actions">
        <button type="button" class="primary-button" data-open-node>${escapeHtml(details.actionLabel)}</button>
      </div>
    ` : ''}
  `

  const viewportRect = viewport.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  const maxLeft = Math.max(16, viewportRect.width - 376)
  const maxTop = Math.max(16, viewportRect.height - 410)
  card.style.left = `${Math.min(Math.max(nodeRect.left - viewportRect.left + nodeRect.width + 14, 16), maxLeft)}px`
  card.style.top = `${Math.min(Math.max(nodeRect.top - viewportRect.top - 12, 16), maxTop)}px`

  card.querySelector<HTMLButtonElement>('.relationship-node-card-close')?.addEventListener('click', () => removeCard(viewport))
  card.querySelector<HTMLButtonElement>('[data-open-node]')?.addEventListener('click', () => details.action?.())
  viewport.append(card)

  if (focusAction) {
    const action = card.querySelector<HTMLButtonElement>('[data-open-node]')
    ;(action ?? card.querySelector<HTMLButtonElement>('.relationship-node-card-close'))?.focus()
  }
}

function bindRelationshipNodes(root: ParentNode = document) {
  root.querySelectorAll<SVGGElement>('.spider-node').forEach((node) => {
    if (node.hasAttribute(NODE_BOUND)) return
    node.setAttribute(NODE_BOUND, 'true')
    node.style.pointerEvents = 'all'
    node.classList.add('clickable')
    node.setAttribute('tabindex', '0')
    node.setAttribute('role', 'button')

    const id = node.getAttribute('data-node-id') || node.querySelector('text')?.textContent?.trim() || 'node'
    node.setAttribute('aria-label', `View relationship details for ${id}`)

    let startX = 0
    let startY = 0

    node.addEventListener('pointerdown', (event) => {
      startX = event.clientX
      startY = event.clientY
    }, true)

    node.addEventListener('pointerup', (event) => {
      const moved = Math.hypot(event.clientX - startX, event.clientY - startY)
      if (moved > 6) return
      event.preventDefault()
      event.stopPropagation()
      showNodeCard(node)
    }, true)

    node.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      showNodeCard(node, true)
    }, true)
  })
}

function indicatorPageIsVisible() {
  return Array.from(document.querySelectorAll<HTMLElement>('.record-card code'))
    .some((code) => code.textContent?.trim().startsWith('KSI-'))
}

function returnToControl(controlId: string) {
  document.querySelector('[data-return-control]')?.remove()
  sidebarButton('Controls')?.click()

  let attempts = 0
  const locate = () => {
    attempts += 1
    const control = Array.from(document.querySelectorAll<HTMLButtonElement>('.control-card'))
      .find((item) => item.querySelector('code')?.textContent?.trim() === controlId)

    if (!control && attempts < 40) {
      window.setTimeout(locate, 50)
      return
    }

    if (!control) return
    control.click()
    sessionStorage.removeItem(RETURN_CONTEXT_KEY)

    window.setTimeout(() => {
      const detail = document.querySelector<HTMLElement>('.detail-page')
      if (!detail) return
      activateRelationshipViewer(detail)
      detail.querySelector('.relationship-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  window.setTimeout(locate, 0)
}

function addReturnButton() {
  const controlId = sessionStorage.getItem(RETURN_CONTEXT_KEY)
  const existing = document.querySelector<HTMLElement>('[data-return-control]')

  if (!controlId || !indicatorPageIsVisible()) {
    existing?.remove()
    return
  }

  const labelText = `Return to ${controlId}`

  if (existing) {
    const label = existing.querySelector<HTMLElement>('[data-return-control-label]')
    if (label && label.textContent !== labelText) label.textContent = labelText
    if (existing.getAttribute('aria-label') !== `Return to control ${controlId}`) {
      existing.setAttribute('aria-label', `Return to control ${controlId}`)
    }
    return
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'indicator-return-button'
  button.setAttribute('data-return-control', 'true')
  button.setAttribute('aria-label', `Return to control ${controlId}`)
  button.innerHTML = `<span aria-hidden="true">←</span><span data-return-control-label>${escapeHtml(labelText)}</span>`
  button.addEventListener('click', () => returnToControl(controlId))
  document.body.append(button)
}

function enhanceRelationshipDetails(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.detail-page').forEach(addBreadcrumbs)
  bindRelationshipNodes(root)
}

export function installRelationshipNodeDetail() {
  enhanceRelationshipDetails()
  addReturnButton()

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const viewport = event.target.closest<HTMLElement>('.spider-graph-viewport')
    if (!viewport || event.target.closest(`.${CARD_CLASS}`) || event.target.closest('.spider-node')) return
    removeCard(viewport)
  })

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return
        if (node.matches('.detail-page')) addBreadcrumbs(node as HTMLElement)
        else node.querySelectorAll<HTMLElement>('.detail-page').forEach(addBreadcrumbs)
        if (node.matches('.spider-node')) bindRelationshipNodes(node.parentNode ?? document)
        else bindRelationshipNodes(node)
      })
    }
    addReturnButton()
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
