import { loadDataset } from './data/load'

const READY = 'data-dashboard-enhancements-ready'
const NAV_READY = 'data-ksi-nav-ready'
const INDICATOR_HIGHLIGHT_CLASS = 'indicator-navigation-target'

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

async function showThemes(): Promise<void> {
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
  page.innerHTML = `<div class="section-heading"><div><span class="eyebrow">Browse</span><h2>${themes.size} KSI themes</h2></div></div><div class="ksi-theme-list"></div>`
  const list = page.querySelector<HTMLElement>('.ksi-theme-list')!

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
      row.innerHTML = `<code>${indicator.id}</code><span>${indicator.statement}</span>`
      row.addEventListener('click', () => openIndicator(indicator.id))
      indicators.append(row)
    })

    article.append(heading, indicators)
    list.append(article)
  })

  main.classList.add('ksi-themes-mode')
  main.append(page)
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
    }, true)
  }

  if (nav.querySelector('[data-ksi-themes-nav]')) return

  const indicators = Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Indicators')
  if (!indicators) return

  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'KSI Themes'
  button.dataset.ksiThemesNav = 'true'
  button.addEventListener('click', () => { void showThemes() })
  indicators.insertAdjacentElement('afterend', button)
}

function enhance(): void {
  addThemesNav()
  enhanceDashboardTiles()
}

export function installDashboardEnhancements(): void {
  enhance()
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
}
