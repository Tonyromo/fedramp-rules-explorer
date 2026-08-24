import { loadDataset } from './data/load'

const READY = 'data-dashboard-enhancements-ready'

function clickNav(label: string): void {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((item) => item.textContent?.trim().startsWith(label))
  button?.click()
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
    if (!route) return
    card.classList.add('stat-card-link')
    card.setAttribute('role', 'button')
    card.setAttribute('tabindex', '0')
    card.setAttribute('aria-label', `Open ${label}`)
    const open = () => clickNav(route)
    card.addEventListener('click', open)
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() }
    })
  })

  const themesCard = Array.from(grid.querySelectorAll<HTMLElement>('.stat-card'))
    .find((card) => card.querySelector('span')?.textContent?.trim() === 'KSI themes')
  if (themesCard) {
    themesCard.classList.add('stat-card-link')
    themesCard.setAttribute('role', 'button')
    themesCard.setAttribute('tabindex', '0')
    themesCard.addEventListener('click', () => showThemes())
    themesCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showThemes() }
    })
  }
}

async function showThemes(): Promise<void> {
  document.querySelector('.ksi-themes-page')?.remove()
  const main = document.querySelector<HTMLElement>('.main-content')
  if (!main) return
  const existing = Array.from(main.children).filter((child) => !child.classList.contains('topbar')) as HTMLElement[]
  existing.forEach((child) => { child.dataset.ksiHidden = child.style.display; child.style.display = 'none' })

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
      row.addEventListener('click', () => { clickNav('Indicators'); setTimeout(() => {
        const search = document.querySelector<HTMLInputElement>('.search-box input'); if (search) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setter?.call(search, indicator.id); search.dispatchEvent(new Event('input', { bubbles: true })) }
      }, 0) })
      indicators.append(row)
    })
    article.append(heading, indicators)
    list.append(article)
  })
  main.append(page)
}

function addThemesNav(): void {
  const nav = document.querySelector<HTMLElement>('.sidebar nav')
  if (!nav || nav.querySelector('[data-ksi-themes-nav]')) return
  const indicators = Array.from(nav.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.trim() === 'Indicators')
  if (!indicators) return
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'KSI Themes'
  button.dataset.ksiThemesNav = 'true'
  button.addEventListener('click', () => {
    nav.querySelectorAll('button').forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    void showThemes()
  })
  indicators.insertAdjacentElement('afterend', button)
}

function enhance(): void { addThemesNav(); enhanceDashboardTiles() }

export function installDashboardEnhancements(): void {
  enhance()
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true })
}
