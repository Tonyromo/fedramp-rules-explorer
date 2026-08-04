const SHORTCUT_DIALOG_ID = 'keyboard-shortcuts-dialog'

function navigationButton(index: number) {
  return document.querySelectorAll<HTMLButtonElement>('.sidebar nav button')[index]
}

function clearSearch() {
  const input = document.querySelector<HTMLInputElement>('.search-box input')
  if (!input || !input.value) return false
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, '')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

function toggleShortcutDialog() {
  const existing = document.getElementById(SHORTCUT_DIALOG_ID)
  if (existing) {
    existing.remove()
    return
  }

  const dialog = document.createElement('div')
  dialog.id = SHORTCUT_DIALOG_ID
  dialog.className = 'shortcut-dialog-backdrop'
  dialog.innerHTML = `
    <section class="shortcut-dialog" role="dialog" aria-modal="true" aria-labelledby="shortcut-title">
      <div class="shortcut-dialog-heading">
        <h2 id="shortcut-title">Keyboard shortcuts</h2>
        <button type="button" aria-label="Close keyboard shortcuts">Close</button>
      </div>
      <dl>
        <div><dt><kbd>/</kbd></dt><dd>Focus search</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>Go back or clear search</dd></div>
        <div><dt><kbd>Alt</kbd> + <kbd>1–6</kbd></dt><dd>Open a main section</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>Show or hide this panel</dd></div>
      </dl>
    </section>`

  dialog.querySelector('button')?.addEventListener('click', () => dialog.remove())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.remove()
  })
  document.body.appendChild(dialog)
}

function applyRelationshipLayout() {
  document.querySelectorAll<HTMLElement>('.detail-page').forEach((page) => {
    const hasRelationshipSummary = Boolean(page.querySelector('.relationship-summary'))
    page.classList.toggle('control-relationship-map', hasRelationshipSummary)
  })
}

export function installMilestone4Enhancements() {
  const observer = new MutationObserver(applyRelationshipLayout)
  observer.observe(document.body, { childList: true, subtree: true })
  applyRelationshipLayout()

  document.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement | null
    const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement

    if (event.key === '/' && !editing) {
      const input = document.querySelector<HTMLInputElement>('.search-box input')
      if (input) {
        event.preventDefault()
        input.focus()
        input.select()
      }
      return
    }

    if (event.key === '?' && !editing) {
      event.preventDefault()
      toggleShortcutDialog()
      return
    }

    if (event.key === 'Escape') {
      const dialog = document.getElementById(SHORTCUT_DIALOG_ID)
      if (dialog) {
        dialog.remove()
        return
      }
      if (editing) {
        target.blur()
        return
      }
      const back = document.querySelector<HTMLButtonElement>('.back-button')
      if (back) back.click()
      else clearSearch()
      return
    }

    if (event.altKey && /^[1-6]$/.test(event.key)) {
      const button = navigationButton(Number(event.key) - 1)
      if (button) {
        event.preventDefault()
        button.click()
      }
    }
  })
}
