import { loadDataset } from './data/load'

const READY = 'data-cross-reference-ready'
const HIGHLIGHT = 'indicator-navigation-target'
const ORIGIN_KEY = 'frx-cross-reference-origin-rule'
const TARGET_DEFINITION_KEY = 'frx-cross-reference-target-definition'
let locatingDefinition = false

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
  const panel = document.querySelector<HTMLElement>('.main-content > .panel')
  if (!panel || panel.querySelector('.cross-reference-back')) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'back-button cross-reference-back'
  button.textContent = `Back to ${ruleId}`
  button.addEventListener('click', () => returnToRule(ruleId))
  panel.prepend(button)
}

function highlightDefinition(card: HTMLElement): void {
  clearHighlight()
  card.classList.add(HIGHLIGHT)

  // Position the selected definition explicitly below the page header. Using
  // scrollIntoView(center) allowed the browser to clamp near the bottom of the
  // document, which made the navigation appear to land on the wrong record.
  const top = window.scrollY + card.getBoundingClientRect().top - 130
  window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })

  window.setTimeout(() => card.classList.remove(HIGHLIGHT), 4000)
}

function findDefinitionCard(definitionId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.record-card')).find((card) => {
    const id = card.querySelector('code')?.textContent?.trim()
    return id === definitionId
  })
}

function locateDefinition(definitionId: string, ruleId: string): void {
  if (locatingDefinition) return
  locatingDefinition = true
  let attempts = 0

  const locate = () => {
    attempts += 1
    const definitionsActive = navButton('Definitions')?.classList.contains('active')
    const card = definitionsActive ? findDefinitionCard(definitionId) : undefined

    if ((!definitionsActive || !card) && attempts < 60) {
      window.setTimeout(locate, 50)
      return
    }

    locatingDefinition = false
    if (!card) return

    addOriginBackButton(ruleId)
    // Let the inserted back button finish layout before calculating the exact
    // target position, then scroll once only.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        highlightDefinition(card)
        sessionStorage.removeItem(TARGET_DEFINITION_KEY)
      })
    })
  }

  window.setTimeout(locate, 0)
}

function openDefinition(definitionId: string, ruleId: string): void {
  sessionStorage.setItem(ORIGIN_KEY, ruleId)
  sessionStorage.setItem(TARGET_DEFINITION_KEY, definitionId)
  locatingDefinition = false
  clearGlobalSearch()
  navButton('Definitions')?.click()
  locateDefinition(definitionId, ruleId)
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
