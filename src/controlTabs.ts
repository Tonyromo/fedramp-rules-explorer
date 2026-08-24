import { loadDataset } from './data/load'
import type { NormalizedDataset } from './data/types'

const READY = 'data-control-tabs-ready'
let datasetPromise: Promise<NormalizedDataset> | null = null

function getDataset(): Promise<NormalizedDataset> {
  if (!datasetPromise) datasetPromise = loadDataset().then((result) => result.data)
  return datasetPromise
}

function sectionByTitle(detail: HTMLElement, title: string): HTMLElement | undefined {
  return Array.from(detail.querySelectorAll<HTMLElement>(':scope > .detail-section'))
    .find((section) => section.querySelector('h3')?.textContent?.trim() === title)
}

function addTabBehaviour(container: HTMLElement): void {
  const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
  const panels = Array.from(container.querySelectorAll<HTMLElement>('.relationship-tab-panel'))

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
}

function buildEvidencePanel(panel: HTMLElement, controlId: string, data: NormalizedDataset): void {
  const evidence = new Map<string, Set<string>>()

  data.rules
    .filter((rule) => rule.controls.includes(controlId))
    .forEach((rule) => {
      rule.artifacts.forEach((artifact) => {
        const value = artifact.trim()
        if (!value) return
        const basis = evidence.get(value) ?? new Set<string>()
        basis.add(`Rule ${rule.id}`)
        evidence.set(value, basis)
      })
    })

  data.indicators
    .filter((indicator) => indicator.controls.includes(controlId))
    .forEach((indicator) => {
      indicator.artifacts.forEach((artifact) => {
        const value = artifact.trim()
        if (!value) return
        const basis = evidence.get(value) ?? new Set<string>()
        basis.add(`Indicator ${indicator.id}`)
        evidence.set(value, basis)
      })
    })

  panel.replaceChildren()

  const intro = document.createElement('div')
  intro.className = 'suggested-evidence-intro'
  intro.innerHTML = '<strong>Non-authoritative guidance</strong><p>These suggestions are derived from artifact references in the official FedRAMP rules and indicators associated with this control. Each organization should determine the evidence appropriate to its implementation and assessment.</p>'
  panel.append(intro)

  if (evidence.size === 0) {
    const empty = document.createElement('p')
    empty.className = 'suggested-evidence-empty'
    empty.textContent = 'No evidence suggestions could be derived from the current FedRAMP dataset for this control.'
    panel.append(empty)
    return
  }

  const table = document.createElement('div')
  table.className = 'suggested-evidence-table'
  table.innerHTML = '<div class="suggested-evidence-header"><span>Suggested evidence</span><span>Basis</span></div>'

  Array.from(evidence.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([artifact, basis]) => {
      const row = document.createElement('div')
      row.className = 'suggested-evidence-row'

      const evidenceCell = document.createElement('span')
      evidenceCell.textContent = artifact

      const basisCell = document.createElement('span')
      basisCell.className = 'suggested-evidence-basis'
      basisCell.textContent = Array.from(basis).sort().join(' · ')

      row.append(evidenceCell, basisCell)
      table.append(row)
    })

  panel.append(table)
}

async function enhanceControlDetail(detail: HTMLElement): Promise<void> {
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
      <button class="relationship-tab active" type="button" role="tab" aria-selected="true" aria-controls="suggested-evidence-panel">Suggested Evidence</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="referenced-indicators-panel">Referenced Indicators</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="referenced-rules-panel">Referenced Rules</button>
      <button class="relationship-tab" type="button" role="tab" aria-selected="false" aria-controls="processes-panel">Processes</button>
    </div>
    <div class="relationship-tab-content">
      <div class="relationship-tab-panel active" role="tabpanel" id="suggested-evidence-panel"><p class="suggested-evidence-loading">Deriving suggestions from the validated FedRAMP dataset…</p></div>
      <div class="relationship-tab-panel" role="tabpanel" id="referenced-indicators-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="referenced-rules-panel" hidden></div>
      <div class="relationship-tab-panel" role="tabpanel" id="processes-panel" hidden></div>
    </div>
  `

  summary.insertAdjacentElement('afterend', tabs)
  tabs.querySelector<HTMLElement>('#referenced-indicators-panel')?.append(indicators)
  tabs.querySelector<HTMLElement>('#referenced-rules-panel')?.append(rules)
  tabs.querySelector<HTMLElement>('#processes-panel')?.append(processes)
  addTabBehaviour(tabs)

  const evidencePanel = tabs.querySelector<HTMLElement>('#suggested-evidence-panel')
  if (!evidencePanel) return

  try {
    const data = await getDataset()
    if (!detail.isConnected) return
    buildEvidencePanel(evidencePanel, controlId, data)
  } catch {
    evidencePanel.innerHTML = '<p class="suggested-evidence-empty">Suggested evidence could not be derived from the current validated dataset.</p>'
  }
}

function enhance(): void {
  document.querySelectorAll<HTMLElement>('.detail-page').forEach((detail) => {
    void enhanceControlDetail(detail)
  })
}

export function installControlTabs(): void {
  enhance()
  const observer = new MutationObserver(enhance)
  observer.observe(document.body, { childList: true, subtree: true })
}
