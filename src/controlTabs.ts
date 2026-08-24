import { getSuggestedEvidence } from './data/suggestedEvidence'

const READY = 'data-control-tabs-ready'
const CONTROL_ORIGIN_KEY = 'frx-control-origin'

function sectionByTitle(detail: HTMLElement, title: string): HTMLElement | undefined {
  return Array.from(detail.querySelectorAll<HTMLElement>(':scope > .detail-section'))
    .find((section) => section.querySelector('h3')?.textContent?.trim() === title)
}

function addTabBehaviour(container: HTMLElement): void {
  const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
  const panels = Array.from(container.querySelectorAll<HTMLElement>('.relationship-tab-panel'))
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((item) => { const active = item === tab; item.classList.toggle('active', active); item.setAttribute('aria-selected', String(active)) })
    panels.forEach((panel) => { const active = panel.id === tab.getAttribute('aria-controls'); panel.classList.toggle('active', active); panel.hidden = !active })
  }))
}

function buildEvidencePanel(panel: HTMLElement, controlId: string): void {
  const evidence = getSuggestedEvidence(controlId)
  panel.replaceChildren()
  const intro = document.createElement('div')
  intro.className = 'suggested-evidence-intro'
  intro.innerHTML = '<strong>Suggested Evidence — non-authoritative</strong><p>This is a practical working aid derived from the control intent and common assessor evidence patterns. It is not an official FedRAMP evidence requirement. Each organization should determine the evidence appropriate to its implementation and assessment.</p>'
  panel.append(intro)

  const list = document.createElement('div')
  list.className = 'suggested-evidence-table suggested-evidence-list'
  evidence.forEach((item) => {
    const row = document.createElement('div')
    row.className = 'suggested-evidence-row'
    const evidenceCell = document.createElement('span')
    evidenceCell.textContent = item.evidence
    row.append(evidenceCell)
    list.append(row)
  })
  panel.append(list)
}

function rememberControlOrigin(controlId: string): void {
  sessionStorage.setItem(CONTROL_ORIGIN_KEY, controlId)
}

function makeReferencedIndicatorsInteractive(panel: HTMLElement, controlId: string): void {
  const items = Array.from(panel.querySelectorAll<HTMLElement>('.relationship-list > article, .relationship-table-row'))
  items.forEach((item) => {
    const id = item.querySelector('code')?.textContent?.trim()
    if (!id || item.dataset.ksiLinked === 'true') return
    item.dataset.ksiLinked = 'true'
    item.classList.add('referenced-indicator-link')
    item.setAttribute('role', 'button')
    item.setAttribute('tabindex', '0')
    item.setAttribute('aria-label', `Open ${id} in KSI Themes`)

    const open = () => {
      rememberControlOrigin(controlId)
      document.dispatchEvent(new CustomEvent('frx-open-ksi-theme-indicator', { detail: { indicatorId: id, controlId } }))
    }

    item.addEventListener('click', open)
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    })
  })
}

function rememberRuleOrigins(panel: HTMLElement, controlId: string): void {
  panel.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    if (button.dataset.controlOriginReady === 'true') return
    button.dataset.controlOriginReady = 'true'
    button.addEventListener('click', () => rememberControlOrigin(controlId), { capture: true })
  })
}

function enhanceControlDetail(detail: HTMLElement): void {
  if (detail.hasAttribute(READY)) return
  const summary = detail.querySelector<HTMLElement>(':scope > .relationship-summary')
  const rules = sectionByTitle(detail, 'Referenced rules')
  const indicators = sectionByTitle(detail, 'Referenced indicators')
  const processes = sectionByTitle(detail, 'Processes')
  const controlId = detail.querySelector('.detail-header h2')?.textContent?.trim()
  if (!summary || !rules || !indicators || !processes || !controlId) return
  detail.setAttribute(READY, 'true')

  const tabs = document.createElement('section')
  tabs.className = 'detail-section relationship-tabs control-tabs'
  tabs.innerHTML = `
    <div class="relationship-tabs-nav" role="tablist" aria-label="Control detail sections">
      <button class="relationship-tab active" type="button" role="tab" aria-selected="true" aria-controls="referenced-indicators-panel">Referenced Indicators</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="suggested-evidence-panel">Suggested Evidence</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="referenced-rules-panel">Referenced Rules</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="processes-panel">Processes</button>
    </div>
    <div class="relationship-tab-content">
      <div class="relationship-tab-panel active" role="tabpanel" id="referenced-indicators-panel"></div>
      <div class="relationship-tab-panel" role="tabpanel" id="suggested-evidence-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="referenced-rules-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="processes-panel" hidden></div>
    </div>`
  summary.insertAdjacentElement('afterend', tabs)

  const indicatorsPanel = tabs.querySelector<HTMLElement>('#referenced-indicators-panel')
  const rulesPanel = tabs.querySelector<HTMLElement>('#referenced-rules-panel')
  indicatorsPanel?.append(indicators)
  rulesPanel?.append(rules)
  tabs.querySelector<HTMLElement>('#processes-panel')?.append(processes)
  addTabBehaviour(tabs)

  const evidencePanel = tabs.querySelector<HTMLElement>('#suggested-evidence-panel')
  if (evidencePanel) buildEvidencePanel(evidencePanel, controlId)
  if (indicatorsPanel) makeReferencedIndicatorsInteractive(indicatorsPanel, controlId)
  if (rulesPanel) rememberRuleOrigins(rulesPanel, controlId)
}

function enhance(): void { document.querySelectorAll<HTMLElement>('.detail-page').forEach(enhanceControlDetail) }
export function installControlTabs(): void { enhance(); new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true }) }
