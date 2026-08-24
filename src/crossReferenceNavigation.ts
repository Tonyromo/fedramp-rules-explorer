import { loadDataset } from './data/load'

const DEFINITION_READY = 'data-cross-reference-ready'
const RELATED_READY = 'data-related-rule-cross-reference-ready'
const KSI_READY = 'data-rule-ksi-cross-reference-ready'
const HIGHLIGHT = 'indicator-navigation-target'
const ORIGIN_KEY = 'frx-cross-reference-origin-rule'
const TARGET_DEFINITION_KEY = 'frx-cross-reference-target-definition'
const RELATED_ORIGIN_KEY = 'frx-related-rule-origin'
const RELATED_TARGET_KEY = 'frx-related-rule-target'
const NAV_READY = 'data-cross-reference-nav-ready'
let locatingDefinition = false
let locatingRelatedRule = false

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

function setGlobalSearch(value: string): boolean {
  const input = document.querySelector<HTMLInputElement>('.search-box input')
  if (!input) return false
  if (input.value === value) return true

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

function clearRuleFilters(): void {
  const panel = document.querySelector<HTMLElement>('.filter-panel')
  const clear = panel?.querySelector<HTMLButtonElement>('.filter-heading .text-button')
  clear?.click()
}

function clearDefinitionCrossReferenceState(): void {
  sessionStorage.removeItem(ORIGIN_KEY)
  sessionStorage.removeItem(TARGET_DEFINITION_KEY)
  locatingDefinition = false
  clearHighlight()
}

function clearRelatedRuleState(): void {
  sessionStorage.removeItem(RELATED_ORIGIN_KEY)
  sessionStorage.removeItem(RELATED_TARGET_KEY)
  locatingRelatedRule = false
}

function returnToRule(ruleId: string): void {
  setGlobalSearch('')
  clearDefinitionCrossReferenceState()
  clearRelatedRuleState()
  navButton('Rules')?.click()
  locateAndOpenRule(ruleId)
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

function addRelatedRuleBackButton(detail: HTMLElement, originRuleId: string): void {
  const actions = detail.querySelector<HTMLElement>('.detail-actions')
  if (!actions || actions.querySelector('.related-rule-back')) return

  const nativeBack = actions.querySelector<HTMLButtonElement>('.back-button')
  if (nativeBack) nativeBack.style.display = 'none'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'back-button related-rule-back'
  button.textContent = `Back to ${originRuleId}`
  button.addEventListener('click', () => returnToRule(originRuleId))
  actions.prepend(button)
}

function findDefinitionCard(definitionId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.record-card')).find((card) => {
    const id = card.querySelector('.record-header code')?.textContent?.trim()
    return id === definitionId
  })
}

function highlightDefinition(card: HTMLElement): void {
  clearHighlight()
  card.classList.add(HIGHLIGHT)
  card.scrollIntoView({ behavior: 'auto', block: 'start' })
  window.scrollBy({ top: -110, behavior: 'auto' })
  window.setTimeout(() => card.classList.remove(HIGHLIGHT), 4000)
}

function locateDefinition(definitionId: string, ruleId: string): void {
  if (locatingDefinition) return
  locatingDefinition = true
  let attempts = 0

  const locate = () => {
    attempts += 1
    const definitionsActive = navButton('Definitions')?.classList.contains('active')

    if (!definitionsActive) {
      if (attempts < 60) {
        window.setTimeout(locate, 50)
        return
      }
      locatingDefinition = false
      return
    }

    const searchReady = setGlobalSearch(definitionId)
    const card = searchReady ? findDefinitionCard(definitionId) : undefined

    if (!card && attempts < 60) {
      window.setTimeout(locate, 50)
      return
    }

    locatingDefinition = false
    if (!card) return

    addOriginBackButton(ruleId)
    window.requestAnimationFrame(() => highlightDefinition(card))
    sessionStorage.removeItem(TARGET_DEFINITION_KEY)
  }

  window.setTimeout(locate, 0)
}

function openDefinition(definitionId: string, ruleId: string): void {
  sessionStorage.setItem(ORIGIN_KEY, ruleId)
  sessionStorage.setItem(TARGET_DEFINITION_KEY, definitionId)
  locatingDefinition = false
  navButton('Definitions')?.click()
  locateDefinition(definitionId, ruleId)
}

function findRuleCard(ruleId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.rule-card')).find((card) =>
    card.querySelector('.rule-card-top code')?.textContent?.trim() === ruleId,
  )
}

function locateAndOpenRule(ruleId: string, originRuleId?: string): void {
  if (locatingRelatedRule) return
  locatingRelatedRule = true
  let attempts = 0

  const locate = () => {
    attempts += 1
    const rulesActive = navButton('Rules')?.classList.contains('active')
    if (!rulesActive) {
      if (attempts < 60) {
        window.setTimeout(locate, 50)
        return
      }
      locatingRelatedRule = false
      return
    }

    clearRuleFilters()
    const searchReady = setGlobalSearch(ruleId)
    const card = searchReady ? findRuleCard(ruleId) : undefined
    const open = card?.querySelector<HTMLButtonElement>('.rule-card-open')

    if (!open && attempts < 60) {
      window.setTimeout(locate, 50)
      return
    }

    locatingRelatedRule = false
    if (!open) return

    open.click()
    if (originRuleId) {
      sessionStorage.setItem(RELATED_ORIGIN_KEY, originRuleId)
      sessionStorage.setItem(RELATED_TARGET_KEY, ruleId)
    }
  }

  window.setTimeout(locate, 0)
}

function openRelatedRule(targetRuleId: string, originRuleId: string): void {
  sessionStorage.setItem(RELATED_ORIGIN_KEY, originRuleId)
  sessionStorage.setItem(RELATED_TARGET_KEY, targetRuleId)
  locatingRelatedRule = false
  navButton('Rules')?.click()
  locateAndOpenRule(targetRuleId, originRuleId)
}

function openKsiIndicator(indicatorId: string, ruleId: string): void {
  setGlobalSearch('')
  document.dispatchEvent(new CustomEvent('frx-open-ksi-theme-indicator', {
    detail: { indicatorId, ruleId },
  }))
}

async function enhanceRuleDefinitions(detail: HTMLElement): Promise<void> {
  if (detail.hasAttribute(DEFINITION_READY)) return
  const ruleId = currentRuleId(detail)
  if (!ruleId) return

  const headings = Array.from(detail.querySelectorAll<HTMLHeadingElement>('.detail-section h3'))
  const heading = headings.find((item) => item.textContent?.trim() === 'Definitions')
  const section = heading?.closest<HTMLElement>('.detail-section')
  if (!section) return

  detail.setAttribute(DEFINITION_READY, 'true')
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

async function enhanceRelatedRules(detail: HTMLElement): Promise<void> {
  if (detail.hasAttribute(RELATED_READY)) return
  const ruleId = currentRuleId(detail)
  if (!ruleId) return
  detail.setAttribute(RELATED_READY, 'true')

  const { data } = await loadDataset()
  const rule = data.rules.find((candidate) => candidate.id === ruleId)
  if (!rule?.relatedRules.length) return

  const resolved = rule.relatedRules
    .map((id) => data.rules.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
  if (!resolved.length) return

  const section = document.createElement('section')
  section.className = 'detail-section related-rules-section'

  const heading = document.createElement('h3')
  heading.textContent = 'Related rules'
  section.append(heading)

  const list = document.createElement('div')
  list.className = 'relationship-list related-rules-list'

  resolved.forEach((related) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'related-rule-link'
    button.innerHTML = `<code>${related.id}</code><span>${related.statement || 'No statement supplied.'}</span><small>${related.processId} · ${related.force || 'Unspecified'}</small>`
    button.addEventListener('click', () => openRelatedRule(related.id, ruleId))
    list.append(button)
  })

  section.append(list)

  const sourceSection = Array.from(detail.querySelectorAll<HTMLElement>('.detail-section'))
    .find((candidate) => candidate.querySelector('h3')?.textContent?.trim() === 'Source information')
  if (sourceSection) sourceSection.before(section)
  else detail.append(section)
}

async function enhanceRuleKsiIndicators(detail: HTMLElement): Promise<void> {
  if (detail.hasAttribute(KSI_READY)) return
  const ruleId = currentRuleId(detail)
  if (!ruleId) return
  detail.setAttribute(KSI_READY, 'true')

  const { data } = await loadDataset()
  const rule = data.rules.find((candidate) => candidate.id === ruleId)
  if (!rule?.controls.length) return

  const ruleControls = new Set(rule.controls.map((control) => control.toLowerCase()))
  const related = data.indicators
    .map((indicator) => ({
      indicator,
      sharedControls: indicator.controls.filter((control) => ruleControls.has(control.toLowerCase())),
    }))
    .filter((entry) => entry.sharedControls.length > 0)
    .sort((a, b) => a.indicator.id.localeCompare(b.indicator.id))

  if (!related.length) return

  const section = document.createElement('section')
  section.className = 'detail-section rule-ksi-section'

  const heading = document.createElement('h3')
  heading.textContent = 'Related KSI indicators'
  section.append(heading)

  const note = document.createElement('p')
  note.className = 'relationship-note'
  note.textContent = 'Derived from controls referenced by both this rule and the KSI indicator.'
  section.append(note)

  const list = document.createElement('div')
  list.className = 'relationship-list related-rules-list'

  related.forEach(({ indicator, sharedControls }) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'related-rule-link rule-ksi-link'
    button.innerHTML = `<code>${indicator.id}</code><span>${indicator.statement || 'No statement supplied.'}</span><small>${indicator.themeId} · Shared control${sharedControls.length === 1 ? '' : 's'}: ${sharedControls.join(', ')}</small>`
    button.addEventListener('click', () => openKsiIndicator(indicator.id, ruleId))
    list.append(button)
  })

  section.append(list)
  const sourceSection = Array.from(detail.querySelectorAll<HTMLElement>('.detail-section'))
    .find((candidate) => candidate.querySelector('h3')?.textContent?.trim() === 'Source information')
  if (sourceSection) sourceSection.before(section)
  else detail.append(section)
}

function installNavigationCleanup(): void {
  const nav = document.querySelector<HTMLElement>('.sidebar nav')
  if (!nav || nav.hasAttribute(NAV_READY)) return
  nav.setAttribute(NAV_READY, 'true')

  nav.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null
    if (!button) return
    const label = button.textContent?.trim() ?? ''

    const definitionOrigin = sessionStorage.getItem(ORIGIN_KEY)
    if (definitionOrigin && !label.startsWith('Definitions')) {
      setGlobalSearch('')
      clearDefinitionCrossReferenceState()
    }

    const relatedOrigin = sessionStorage.getItem(RELATED_ORIGIN_KEY)
    if (relatedOrigin && !label.startsWith('Rules')) {
      setGlobalSearch('')
      clearRelatedRuleState()
    }
  }, true)
}

function enhance(): void {
  installNavigationCleanup()

  const detail = document.querySelector<HTMLElement>('.detail-page')
  if (detail) {
    void enhanceRuleDefinitions(detail)
    void enhanceRelatedRules(detail)
    void enhanceRuleKsiIndicators(detail)

    const currentId = currentRuleId(detail)
    const relatedOrigin = sessionStorage.getItem(RELATED_ORIGIN_KEY)
    const relatedTarget = sessionStorage.getItem(RELATED_TARGET_KEY)
    if (relatedOrigin && relatedTarget && currentId === relatedTarget) addRelatedRuleBackButton(detail, relatedOrigin)
  }

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
  document.addEventListener('frx-return-to-rule', (event) => {
    const ruleId = (event as CustomEvent<{ ruleId?: string }>).detail?.ruleId
    if (ruleId) returnToRule(ruleId)
  })
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
}
