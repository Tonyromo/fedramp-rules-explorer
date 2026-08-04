function removeControlProcessElements(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.control-card dl > div').forEach((metric) => {
    const label = metric.querySelector('dt')?.textContent?.trim().toLowerCase() ?? ''
    if (label.includes('process')) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.relationship-summary .stat-card').forEach((metric) => {
    const label = metric.querySelector('span')?.textContent?.trim().toLowerCase() ?? ''
    if (label.includes('process')) metric.remove()
  })

  root.querySelectorAll<HTMLElement>('.detail-section').forEach((section) => {
    const heading = section.querySelector('h3')?.textContent?.trim().toLowerCase() ?? ''
    if (heading === 'processes' || heading === 'rule processes') section.remove()
  })
}

export function installControlClarity(): void {
  removeControlProcessElements()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) removeControlProcessElements(node)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
