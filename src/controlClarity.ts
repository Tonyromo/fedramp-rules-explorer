function metricValue(metric: HTMLElement): number | null {
  const value = metric.querySelector('dd, strong')?.textContent?.trim()
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function tidyControlMetrics(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.control-card dl > div').forEach((metric) => {
    const label = metric.querySelector('dt')?.textContent?.trim().toLowerCase() ?? ''
    const value = metricValue(metric)

    if (label.includes('process') || (label === 'rules' && value === 0)) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.relationship-summary .stat-card').forEach((metric) => {
    const label = metric.querySelector('span')?.textContent?.trim().toLowerCase() ?? ''
    const value = metricValue(metric)

    if (label.includes('process') || (label.includes('rule') && value === 0)) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.detail-section').forEach((section) => {
    const heading = section.querySelector('h3')?.textContent?.trim().toLowerCase() ?? ''

    if (heading === 'processes' || heading === 'rule processes') {
      section.remove()
      return
    }

    if (heading === 'referenced rules') {
      const text = section.textContent?.toLowerCase() ?? ''
      if (text.includes('no rules reference this control')) section.remove()
    }
  })
}

export function installControlClarity(): void {
  tidyControlMetrics()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) tidyControlMetrics(node)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
