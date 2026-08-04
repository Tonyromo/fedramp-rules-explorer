const OVERLAY_ID = 'indicator-detail-overlay'

function closeIndicatorDetail() {
  document.getElementById(OVERLAY_ID)?.remove()
}

function openIndicatorDetail(row: HTMLElement) {
  const id = row.querySelector('code')?.textContent?.trim() || 'Indicator'
  const statement = row.querySelector('span')?.textContent?.trim() || 'No statement supplied.'
  const theme = row.querySelector('small')?.textContent?.trim() || 'Unspecified theme'
  const control = document.querySelector('.detail-header h2')?.textContent?.trim() || ''

  closeIndicatorDetail()

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.className = 'indicator-detail-backdrop'
  overlay.innerHTML = `
    <section class="indicator-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="indicator-detail-title">
      <div class="indicator-detail-actions">
        <button type="button" class="back-button" data-indicator-close>Back to control</button>
      </div>
      <div class="detail-header">
        <div>
          <span class="eyebrow">${escapeHtml(theme)}</span>
          <h2 id="indicator-detail-title">${escapeHtml(id)}</h2>
        </div>
      </div>
      <section class="detail-section">
        <h3>Statement</h3>
        <p class="official-text">${escapeHtml(statement)}</p>
      </section>
      <section class="detail-section">
        <h3>Related control</h3>
        <div class="chip-list"><span>${escapeHtml(control || 'Current control')}</span></div>
      </section>
      <section class="detail-section source-info">
        <h3>Relationship source</h3>
        <p>Calculated from official control mappings in the current validated FedRAMP dataset.</p>
      </section>
    </section>
  `

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay || (event.target as HTMLElement).closest('[data-indicator-close]')) closeIndicatorDetail()
  })
  document.body.append(overlay)
  overlay.querySelector<HTMLButtonElement>('[data-indicator-close]')?.focus()
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!)
}

document.addEventListener('click', (event) => {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-indicator-navigation-ready]')
  if (!row) return
  event.preventDefault()
  event.stopImmediatePropagation()
  openIndicatorDetail(row)
}, true)

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById(OVERLAY_ID)) closeIndicatorDetail()
})
