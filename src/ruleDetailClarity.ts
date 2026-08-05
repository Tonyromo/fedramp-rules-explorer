function enhanceRuleDetail(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.detail-page').forEach((page) => {
    const statementSection = [...page.querySelectorAll<HTMLElement>('.detail-section')]
      .find((section) => section.querySelector('h3')?.textContent?.trim().toLowerCase() === 'statement')
    const processSection = [...page.querySelectorAll<HTMLElement>('.detail-section')]
      .find((section) => section.querySelector('h3')?.textContent?.trim().toLowerCase() === 'process and subset')

    if (!statementSection || !processSection) return
    page.classList.add('rule-detail-page')

    if (!statementSection.querySelector('.authoritative-label')) {
      const label = document.createElement('div')
      label.className = 'authoritative-label'
      label.innerHTML = '<strong>Official FedRAMP rule text</strong><span>Displayed from the validated upstream dataset without modification.</span>'
      statementSection.insertBefore(label, statementSection.querySelector('.official-text'))
    }

    const sourceSection = page.querySelector<HTMLElement>('.source-info')
    if (sourceSection && !sourceSection.dataset.collapsible) {
      sourceSection.dataset.collapsible = 'true'
      sourceSection.classList.add('source-info-collapsed')

      const heading = sourceSection.querySelector('h3')
      if (heading) {
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'source-toggle'
        button.setAttribute('aria-expanded', 'false')
        button.innerHTML = '<span>Source and verification</span><small>Show details</small>'
        heading.replaceWith(button)
        button.addEventListener('click', () => {
          const collapsed = sourceSection.classList.toggle('source-info-collapsed')
          button.setAttribute('aria-expanded', String(!collapsed))
          const hint = button.querySelector('small')
          if (hint) hint.textContent = collapsed ? 'Show details' : 'Hide details'
        })
      }
    }
  })
}

export function installRuleDetailClarity(): void {
  enhanceRuleDetail()
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) enhanceRuleDetail(node)
      })
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
