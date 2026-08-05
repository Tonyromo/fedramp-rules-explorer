const RETURN_CONTEXT_KEY = 'fedramp-rules-explorer:return-control'
const CARD_CLASS = 'relationship-node-card'
const NODE_BOUND = 'data-indicator-detail-bound'

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

function sidebarButton(label: string) {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith(label))
}

function findIndicatorRow(detail: HTMLElement, id: string) {
  return Array.from(detail.querySelectorAll<HTMLElement>('#referenced-indicators-panel .relationship-table-row'))
    .find((row) => row.querySelector('code')?.textContent?.trim() === id)
}

function removeCard(viewport?: HTMLElement) {
  (viewport ?? document).querySelector<HTMLElement>(`.${CARD_CLASS}`)?.remove()
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

function showIndicatorCard(node: SVGGElement, focusAction = false) {
  const detail = node.closest<HTMLElement>('.detail-page')
  const viewport = node.closest<HTMLElement>('.spider-graph-viewport')
  if (!detail || !viewport) return

  const id = node.getAttribute('data-node-id') || node.querySelector('text')?.textContent?.trim() || ''
  if (!id) return

  const row = findIndicatorRow(detail, id)
  const statement = row?.querySelector('span')?.textContent?.trim() || 'No statement supplied.'
  const theme = row?.querySelector('small')?.textContent?.trim() || 'Key Security Indicator'
  const controlId = detail.querySelector('.detail-header h2')?.textContent?.trim() || 'Control'

  removeCard(viewport)

  const card = document.createElement('section')
  card.className = CARD_CLASS
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-label', `Indicator ${id}`)
  card.innerHTML = `
    <button type="button" class="relationship-node-card-close" aria-label="Close indicator details">×</button>
    <span class="relationship-node-card-type">${escapeHtml(theme)}</span>
    <h4>${escapeHtml(id)}</h4>
    <p>${escapeHtml(statement)}</p>
    <div class="relationship-node-card-actions">
      <button type="button" class="primary-button" data-open-indicator>Open indicator</button>
    </div>
  `

  const viewportRect = viewport.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  const maxLeft = Math.max(16, viewportRect.width - 356)
  const maxTop = Math.max(16, viewportRect.height - 250)
  card.style.left = `${Math.min(Math.max(nodeRect.left - viewportRect.left + nodeRect.width + 14, 16), maxLeft)}px`
  card.style.top = `${Math.min(Math.max(nodeRect.top - viewportRect.top - 12, 16), maxTop)}px`

  card.querySelector<HTMLButtonElement>('.relationship-node-card-close')?.addEventListener('click', () => removeCard(viewport))
  card.querySelector<HTMLButtonElement>('[data-open-indicator]')?.addEventListener('click', () => openIndicatorPage(id, controlId))
  viewport.append(card)

  if (focusAction) card.querySelector<HTMLButtonElement>('[data-open-indicator]')?.focus()
}

function bindIndicatorNodes(root: ParentNode = document) {
  root.querySelectorAll<SVGGElement>('.spider-node.node-indicator').forEach((node) => {
    if (node.hasAttribute(NODE_BOUND)) return
    node.setAttribute(NODE_BOUND, 'true')
    node.style.pointerEvents = 'all'

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
      showIndicatorCard(node)
    }, true)

    node.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      showIndicatorCard(node, true)
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
      const viewerTab = Array.from(document.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
        .find((button) => button.textContent?.trim() === 'Relationship Viewer')
      viewerTab?.click()
      document.querySelector('.relationship-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  if (existing) return

  const topbar = document.querySelector<HTMLElement>('.topbar')
  if (!topbar) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button indicator-return-button'
  button.setAttribute('data-return-control', 'true')
  button.textContent = `Back to ${controlId}`
  button.addEventListener('click', () => returnToControl(controlId))
  topbar.append(button)
}

export function installRelationshipNodeDetail() {
  bindIndicatorNodes()
  addReturnButton()

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const viewport = event.target.closest<HTMLElement>('.spider-graph-viewport')
    if (!viewport || event.target.closest(`.${CARD_CLASS}`) || event.target.closest('.spider-node.node-indicator')) return
    removeCard(viewport)
  })

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return
        if (node.matches('.spider-node.node-indicator')) bindIndicatorNodes(node.parentNode ?? document)
        else bindIndicatorNodes(node)
      })
    }
    addReturnButton()
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
