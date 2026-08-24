import { loadDataset } from './data/load'

const READY = 'data-cross-reference-ready'
const HIGHLIGHT = 'indicator-navigation-target'
const ORIGIN_KEY = 'frx-cross-reference-origin-rule'
const TARGET_DEFINITION_KEY = 'frx-cross-reference-target-definition'

function navButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith(label))
}

function clearHighlight(): void {
  document.querySelectorAll(`.${HIGHLIGHT}`).forEach((item) => item.classList.remove(HIGHLIGHT))
}

function currentRuleId(detail: HTMLElement): string | undefined {
  const id = detail.querySelector('.detail-header h2')?.textContent?.trim()
  return id || undefined
}

function clearGlobalSearch(): void {
  const input = document.querySelector<HTMLInputElement>('.search-box input')
  if (!input || !input.value) return

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, '')
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function returnToRule(ruleId: string): void {
  sessionStorage.removeItem(ORIGIN_KEY)
  sessionStorage.removeItem(TARGET_DEFINITION_KEY)
  navButton('Rules')?.click()

  let attempts = 0
  const locate = () => {
    attempts += 1
    const card = Array.from(document.querySelectorAll<HTMLElement>('.rule-card'))
      .find((item) => item.querySelector('.rule-card-top code')?.textContent?.trim() === ruleId)
    const open = card?.querySelector<HTMLButtonElement>('.rule-card-open')
    if (!open && attempts < 30) {
      window.setTimeout(locate, 50)
      return
    }
    open?.click()
  }
  window.setTimeout(locate, 0)
}

function addOriginBackButton(ruleId: string): void {
  let attempts = 0
  const add = () => {
    attempts += 1
    const panel = document.querySelector<HTMLElement>('.main-content > .panel')
    if (!panel && attempts < 20) {
      window.setTimeout(add, 50)
      return
    }
    if (!panel || panel.querySelector('.cross-reference-back')) return

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'back-button cross-reference-back'
    button.textContent = `Back to ${ruleId}`
    button.addEventListener('click', () => returnToRule(ruleId))
    panel.prepend(button)
  }
  window.setTimeout(add, 0)
}

function highlightListItem(card: HTMLElement): void {
  clearHighlight()
  card.classList.add(HIGHLIGHT)
  card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 180)
  window.setTimeout(() => card.classList.remove(HIGHLIGHT), 3000)
}

function locateDefinition(definitionId: string, ruleId: string): void {
  let attempts = 0
  const locate = () => {
    attempts += 1
    clearGlobalSearch()

    const definitionsActive = navButton('Definitions')?.classList.contains('active')
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.record-card'))
    const card = cards.find((item) => item.querySelector('.record-header code')?.textContent?.trim() === definitionId)

    if ((!definitionsActive || !card) && attempts < 60) {
      window.setTimeout(locate, 50)
      return
    }
    if (!card) return

    addOriginBackButton(ruleId)
    window.setTimeout(() => highlightListItem(card), 80)
    sessionStorage.removeItem(TARGET_DEFINITION_KEY)
  }
  window.setTimeout(locate, 0)
}

function openDefinition(definitionId: string, ruleId: string): void {
  sessionStorage.setItem(ORIGIN_KEY, ruleId)
  sessionStorage.setItem(TARGET_DEFINITION_KEY, definitionId)
  navButton('Definitions')?.click()
  window.setTimeout(clearGlobalSearch, 0)
  window.setTimeout(() => locateDefinition(definitionId, ruleId), 50)
}

async function enhanceRuleDefinitions(detail: HTMLElement): Promise<void> {
  if (detail.hasAttribute(READY)) return
  const ruleId = currentRuleId(detail)
  if (!ruleId) return

  const headings = Array.from(detail.querySelectorAll<HTMLHeadingElement>('.detail-section h3'))
  const heading = headings.find((item) => item.textContent?.trim() === 'Definitions')
  const section = heading?.closest<HTMLElement>('.detail-section')
  if (!section) return

  detail.setAttribute(READY, 'true')
  const { data } = await loadDataset()

  section.querySelectorAll<HTMLLIElement>('li').forEach((item) => {
    const term = item.querySelector('strong')?.textContent?.trim()
    if (!term) return

    const definition = data.definitions.find((candidate) => candidate.term.toLowerCase() === term.toLowerCase())
    if (!definition) return

    item.classList.add('cross-reference-link')
    item.setAttribute('role', 'button')
    item.setAttribute('tabindex', '0')
    item.setAttribute('aria-label', `Open definition ${term}`)
    item.dataset.definitionId = definition.id

    const open = () => openDefinition(definition.id, ruleId)
    item.addEventListener('click', open)
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    })
  })
}

function enhance(): void {
  const detail = document.querySelector<HTMLElement>('.detail-page')
  if (detail) void enhanceRuleDefinitions(detail)

  const origin = sessionStorage.getItem(ORIGIN_KEY)
  const targetDefinition = sessionStorage.getItem(TARGET_DEFINITION_KEY)
  const definitionsActive = navButton('Definitions')?.classList.contains('active')
  if (origin && definitionsActive && !document.querySelector('.detail-page')) {
    addOriginBackButton(origin)
    if (targetDefinition) locateDefinition(targetDefinition, origin)
  }
}

export function installCrossReferenceNavigation(): void {
  enhance()
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
}
