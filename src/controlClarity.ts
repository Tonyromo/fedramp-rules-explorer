function numericValue(element: Element | null): number | null {
  const value = element?.textContent?.trim() ?? ''
  return /^\d+$/.test(value) ? Number(value) : null
}

function hideEmptyControlContent(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.control-card dl > div').forEach((metric) => {
    const value = numericValue(metric.querySelector('dd'))
    if (value === 0) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.relationship-summary .stat-card').forEach((metric) => {
    const value = numericValue(metric.querySelector('strong'))
    if (value === 0) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.detail-section').forEach((section) => {
    const heading = section.querySelector('h3')?.textContent?.trim().toLowerCase() ?? ''
    const text = section.textContent?.toLowerCase() ?? ''

    const isEmptyRelationship =
      (heading === 'referenced rules' && text.includes('no rules reference this control')) ||
      (heading === 'referenced indicators' && text.includes('no indicators reference this control')) ||
      ((heading === 'processes' || heading === 'rule processes') && !section.querySelector('.chip-list > *'))

    if (isEmptyRelationship) section.remove()
  })

  root.querySelectorAll<HTMLElement>('[role="tab"], .tab-button, .detail-tab').forEach((tab) => {
    const label = tab.textContent?.trim() ?? ''
    const countMatch = label.match(/\((\d+)\)|\b(\d+)\b$/)
    const count = countMatch ? Number(countMatch[1] ?? countMatch[2]) : null
    if (count === 0) tab.remove()
  })
}

export function installControlClarity(): void {
  hideEmptyControlContent()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) hideEmptyControlContent(node)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
