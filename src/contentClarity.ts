const emptyPhrases = [
  'none listed',
  'no directly linked definitions found',
  'no rules reference this control',
  'no indicators reference this control',
]

function sectionIsEmpty(section: HTMLElement): boolean {
  const text = section.textContent?.trim().toLowerCase() ?? ''
  return emptyPhrases.some((phrase) => text.includes(phrase))
}

function tidyEmptyContent(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.detail-section').forEach((section) => {
    if (sectionIsEmpty(section)) section.remove()
  })

  root.querySelectorAll<HTMLElement>('.chip-list').forEach((list) => {
    if (!list.querySelector('button, span') && !(list.textContent?.trim())) list.remove()
  })

  root.querySelectorAll<HTMLElement>('.record-card .chip-list').forEach((list) => {
    if (!list.querySelector('button, span')) list.remove()
  })
}

export function installContentClarity(): void {
  tidyEmptyContent()

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) tidyEmptyContent(node)
      })
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}
