function hasMeaningfulContent(panel: HTMLElement): boolean {
  if (panel.id === 'relationship-viewer-panel') {
    return panel.querySelectorAll('.spider-node:not(.node-control)').length > 0
  }

  if (panel.id === 'referenced-indicators-panel') {
    return panel.querySelectorAll('.relationship-table-row, .relationship-list > article').length > 0
  }

  if (panel.id === 'referenced-rules-panel') {
    return panel.querySelectorAll('.relationship-table-row, .relationship-list > button').length > 0
  }

  if (panel.id === 'processes-panel') {
    return panel.querySelectorAll('.chip-list > span').length > 0
  }

  return panel.children.length > 0 && panel.textContent?.trim() !== ''
}

function tidyRelationshipTabs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.relationship-tabs').forEach((container) => {
    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('.relationship-tab'))
    const panels = Array.from(container.querySelectorAll<HTMLElement>('.relationship-tab-panel'))

    tabs.forEach((tab) => {
      const panelId = tab.getAttribute('aria-controls')
      const panel = panels.find((item) => item.id === panelId)
      const visible = Boolean(panel && hasMeaningfulContent(panel))
      tab.hidden = !visible
      if (panel) panel.dataset.hasContent = String(visible)
    })

    const visibleTabs = tabs.filter((tab) => !tab.hidden)
    if (visibleTabs.length === 0) {
      container.remove()
      return
    }

    const activeTab = tabs.find((tab) => tab.classList.contains('active'))
    if (!activeTab || activeTab.hidden) visibleTabs[0].click()
  })
}

export function installControlTabClarity(): void {
  tidyRelationshipTabs()

  const observer = new MutationObserver(() => tidyRelationshipTabs())
  observer.observe(document.body, { childList: true, subtree: true })
}
