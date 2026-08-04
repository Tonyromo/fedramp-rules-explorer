const INDICATOR_HIGHLIGHT_CLASS = 'indicator-navigation-target'

function findIndicatorId(target: Element): string | null {
  const graphNode = target.closest<SVGGElement>('.spider-node.node-indicator')
  if (graphNode) {
    return graphNode.querySelector('text')?.textContent?.trim() ?? null
  }

  const indicatorRow = target.closest<HTMLElement>('#referenced-indicators-panel .relationship-table-row')
  if (indicatorRow) {
    return indicatorRow.querySelector('code')?.textContent?.trim() ?? null
  }

  return null
}

function openIndicator(id: string) {
  const indicatorNavigation = Array.from(document.querySelectorAll<HTMLButtonElement>('.sidebar nav button'))
    .find((button) => button.textContent?.trim().startsWith('Indicators'))

  indicatorNavigation?.click()

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

export function installIndicatorNavigation() {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const id = findIndicatorId(event.target)
    if (!id) return
    event.preventDefault()
    event.stopPropagation()
    openIndicator(id)
  }, true)

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!(event.target instanceof Element)) return
    const id = findIndicatorId(event.target)
    if (!id) return
    event.preventDefault()
    openIndicator(id)
  }, true)
}
