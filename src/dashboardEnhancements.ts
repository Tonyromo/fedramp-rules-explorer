import { loadDataset } from './data/load'

const READY = 'data-dashboard-enhancements-ready'
const NAV_READY = 'data-ksi-nav-ready'
const INDICATOR_HIGHLIGHT_CLASS = 'indicator-navigation-target'
const CONTROL_ORIGIN_KEY = 'frx-control-origin'

function closeThemes(): void {
  document.querySelector('.ksi-themes-page')?.remove()
  document.querySelector<HTMLElement>('.main-content')?.classList.remove('ksi-themes-mode')
}

function clickNav(label: string): void {
  closeThemes()
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((item) => item.textContent?.trim().startsWith(label))
  button?.click()
}

function goBackToControl(controlId: string): void {
  closeThemes()
  const controlsNav = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((item) => item.textContent?.trim() === 'Controls')
  controlsNav?.click()

  let attempts = 0
  const locate = () => {
    attempts += 1
    const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.control-card'))
    const card = cards.find((item) => item.querySelector('code')?.textContent?.trim() === controlId)
    if (!card && attempts < 30) {
      window.setTimeout(locate, 50)
      return
    }
    if (!card) return
    sessionStorage.removeItem(CONTROL_ORIGIN_KEY)
    card.click()
  }
  window.setTimeout(locate, 0)
}

function openIndicator(id: string): void {
  closeThemes()
  clickNav('Indicators')

  let attempts = 0
  const locate = () => {
    attempts += 1
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.record-card'))
    const card = cards.find((item) => item.querySelector('code')?.textContent?.trim() === id)

    if (!card && attempts < 20) {
      window.setTimeout(locate, 50)
      return
    }
    if (!card) return

    document.querySelectorAll(`.${INDICATOR_HIGHLIGHT_CLASS}`).forEach((item) => item.classList.remove(INDICATOR_HIGHLIGHT_CLASS))
    card.classList.add(INDICATOR_HIGHLIGHT_CLASS)
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => card.classList.remove(INDICATOR_HIGHLIGHT_CLASS), 2600)
  }

  window.setTimeout(locate, 0)
}

function enhanceDashboardTiles(): void {
  const grid = document.querySelector<HTMLElement>('.stats-grid')
  if (!grid || grid.hasAttribute(READY)) return
  grid.setAttribute(READY, 'true')

  const routes: Record<string, string> = {
    Definitions: 'Definitions',
    Rules: 'Rules',
    Controls: 'Controls',
    Indicators: 'Indicators',
  }

  grid.querySelectorAll<HTMLElement>('.stat-card').forEach((card) => {
    const label = card.querySelector('span')?.textContent?.trim() ?? ''
    const route = routes[label]
    if (route) {
      card.classList.add('stat-card-link')
      card.setAttribute('role', 'button')
      card.setAttribute('tabindex', '0')
      card.setAttribute('aria-label', `Open ${label}`)
      const open = () => clickNav(route)
      card.addEventListener('click', open)
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() }
      })
    }

    if (label === 'KSI themes') {
      card.classList.add('stat-card-link')
      card.setAttribute('role', 'button')
      card.setAttribute('tabindex', '0')
      card.setAttribute('aria-label', 'Open KSI Themes')
      card.addEventListener('click', () => { void showThemes() })
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void showThemes() }
      })
    }
  })
}

async function showThemes(highlightIndicatorId?: string, originControlId?: string): Promise<void> {
  closeThemes()

  const main = document.querySelector<HTMLElement>('.main-content')
  if (!main) return

  const nav = document.querySelector<HTMLElement>('.sidebar nav')
  nav?.querySelectorAll('button').forEach((item) => item.classList.remove('active'))
  nav?.querySelector<HTMLButtonElement>('[data-ksi-themes-nav]')?.classList.add('active')

  const { data } = await loadDataset()
  const themes = new Map<string, { name: string; indicators: typeof data.indicators }>()
  data.indicators.forEach((indicator) => {
    const current = themes.get(indicator.themeId) ?? { name: indicator.themeName, indicators: [] }
    current.indicators.push(indicator)
    themes.set(indicator.themeId, current)
  })

  const page = document.createElement('section')
  page.className = 'panel ksi-themes-page'

  if (originControlId) {
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'back-button control-origin-back'
    back.textContent = `Back to ${originControlId}`
    back.addEventListener('click', () => goBackToControl(originControlId))
    page.append(back)
  }

  const headingBlock = document.createElement('div')
  headingBlock.className = 'section-heading'
  headingBlock.innerHTML = `<div><span class="eyebrow">Browse</span><h2>${themes.size} KSI themes</h2></div>`
  page.append(headingBlock)

  const list = document.createElement('div')
  list.className = 'ksi-theme-list'
  page.append(list)

  Array.from(themes.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([id, theme]) => {
    const article = document.createElement('article')
    article.className = 'ksi-theme-card'

    const heading = document.createElement('div')
    heading.className = 'ksi-theme-heading'
    heading.innerHTML = `<code>${id}</code><div><h3>${theme.name}</h3><span>${theme.indicators.length} indicator${theme.indicators.length === 1 ? '' : 's'}</span></div>`

    const indicators = document.createElement('div')
    indicators.className = 'ksi-theme-indicators'
    theme.indicators.sort((a, b) => a.id.localeCompare(b.id)).forEach((indicator) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.dataset.indicatorId = indicator.id
      row.innerHTML = `<code>${indicator.id}</code><span>${indicator.statement}</span>`
      row.addEventListener('click', () => openIndicator(indicator.id))
      indicators.append(row)
    })

    article.append(heading, indicators)
    list.append(article)
  })

  main.classList.add('ksi-themes-mode')
  main.append(page)

  if (highlightIndicatorId) {
    const targetRow = Array.from(page.querySelectorAll<HTMLButtonElement>('.ksi-theme-indicators button'))
      .find((row) => row.dataset.indicatorId === highlightIndicatorId)
    if (targetRow) {
      targetRow.classList.add(INDICATOR_HIGHLIGHT_CLASS)
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      window.setTimeout(() => targetRow.classList.remove(INDICATOR_HIGHLIGHT_CLASS), 2600)
    }
  }
}

function enhanceControlOriginBack(): void {
  const controlId = sessionStorage.getItem(CONTROL_ORIGIN_KEY)
  if (!controlId || document.querySelector('.ksi-themes-page')) return

  const detail = document.querySelector<HTMLElement>('.detail-page')
  if (!detail) return
  const currentId = detail.querySelector('.detail-header h2')?.textContent?.trim()
  if (!currentId || currentId === controlId) return

  const actions = detail.querySelector<HTMLElement>('.detail-actions')
  if (!actions || actions.querySelector('.control-origin-back')) return

  const nativeBack = actions.querySelector<HTMLButtonElement>('.back-button')
  if (nativeBack) nativeBack.style.display = 'none'

  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'back-button control-origin-back'
  back.textContent = `Back to ${controlId}`
  back.addEventListener('click', () => goBackToControl(controlId))
  actions.prepend(back)
}

function addThemesNav(): void {
  const nav = document.querySelector<HTMLElement>('.sidebar nav')
  if (!nav) return

  if (!nav.hasAttribute(NAV_READY)) {
    nav.setAttribute(NAV_READY, 'true')
    nav.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null
      if (!button || button.dataset.ksiThemesNav === 'true') return
      closeThemes()
      sessionStorage.removeItem(CONTROL_ORIGIN_KEY)
    }, true)
  }

  if (nav.querySelector('[data-ksi-themes-nav]')) return

  const indicators = Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Indicators')
  if (!indicators) return

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'KSI Themes'
  button.dataset.ksiThemesNav = 'true'
  button.addEventListener('click', () => { sessionStorage.removeItem(CONTROL_ORIGIN_KEY); void showThemes() })
  indicators.insertAdjacentElement('afterend', button)
}

function enhance(): void {
  addThemesNav()
  enhanceDashboardTiles()
  enhanceControlOriginBack()
}

export function installDashboardEnhancements(): void {
  enhance()
  document.addEventListener('frx-open-ksi-theme-indicator', (event) => {
    const detail = (event as CustomEvent<{ indicatorId?: string; controlId?: string }>).detail
    if (!detail?.indicatorId) return
    if (detail.controlId) sessionStorage.setItem(CONTROL_ORIGIN_KEY, detail.controlId)
    void showThemes(detail.indicatorId, detail.controlId)
  })
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
}
