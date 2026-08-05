const RETURN_CONTEXT_KEY = 'fedramp-rules-explorer:return-control'
const CARD_CLASS = 'relationship-node-card'

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
  }

  window.setTimeout(locate, 0)
}

function showIndicatorCard(node: SVGGElement, id: string, focusAction = false) {
  const detail = node.closest<HTMLElement>('.detail-page')
  const viewport = node.closest<HTMLElement>('.spider-graph-viewport')
  if (!detail || !viewport) return

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
  const left = Math.min(Math.max(nodeRect.left - viewportRect.left + nodeRect.width + 14, 16), maxLeft)
  const top = Math.min(Math.max(nodeRect.top - viewportRect.top - 12, 16), maxTop)
  card.style.left = `${left}px`
  card.style.top = `${top}px`

  card.querySelector<HTMLButtonElement>('.relationship-node-card-close')?.addEventListener('click', () => removeCard(viewport))
  card.querySelector<HTMLButtonElement>('[data-open-indicator]')?.addEventListener('click', () => openIndicatorPage(id, controlId))
  viewport.append(card)

  if (focusAction) card.querySelector<HTMLButtonElement>('[data-open-indicator]')?.focus()
}

function addReturnButton() {
  const controlId = sessionStorage.getItem(RETURN_CONTEXT_KEY)
  if (!controlId || !sidebarButton('Indicators')?.classList.contains('active')) return

  const topbar = document.querySelector<HTMLElement>('.topbar')
  if (!topbar || topbar.querySelector('[data-return-control]')) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'secondary-button indicator-return-button'
  button.setAttribute('data-return-control', 'true')
  button.textContent = `Back to ${controlId}`
  button.addEventListener('click', () => {
    sessionStorage.removeItem(RETURN_CONTEXT_KEY)
    sidebarButton('Controls')?.click()

    let attempts = 0
    const locate = () => {
      attempts += 1
      const control = Array.from(document.querySelectorAll<HTMLButtonElement>('.control-card'))
        .find((item) => item.querySelector('code')?.textContent?.trim() === controlId)
      if (!control && attempts < 30) {
        window.setTimeout(locate, 50)
        return
      }
      control?.click()
    }
    window.setTimeout(locate, 0)
  })
  topbar.append(button)
}

export function installRelationshipNodeDetail() {
  document.addEventListener('relationship-indicator-select', (event) => {
    const customEvent = event as CustomEvent<{ id?: string }>
    const node = customEvent.target instanceof Element
      ? customEvent.target.closest<SVGGElement>('.spider-node.node-indicator')
      : null
    const id = customEvent.detail?.id || node?.getAttribute('data-node-id') || ''
    if (!node || !id) return
    showIndicatorCard(node, id)
  })

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const node = event.target.closest<SVGGElement>('.spider-node.node-indicator')
    if (!node) return
    const id = node.getAttribute('data-node-id') || node.querySelector('text')?.textContent?.trim() || ''
    if (!id) return
    event.preventDefault()
    event.stopImmediatePropagation()
    showIndicatorCard(node, id)
  }, true)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!(event.target instanceof Element)) return
    const node = event.target.closest<SVGGElement>('.spider-node.node-indicator')
    if (!node) return
    const id = node.getAttribute('data-node-id') || node.querySelector('text')?.textContent?.trim() || ''
    if (!id) return
    event.preventDefault()
    event.stopImmediatePropagation()
    showIndicatorCard(node, id, true)
  }, true)

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const viewport = event.target.closest<HTMLElement>('.spider-graph-viewport')
    if (!viewport || event.target.closest(`.${CARD_CLASS}`) || event.target.closest('.spider-node.node-indicator')) return
    removeCard(viewport)
  })

  const observer = new MutationObserver(addReturnButton)
  observer.observe(document.body, { childList: true, subtree: true })
  addReturnButton()
}
