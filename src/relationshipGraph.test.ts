import { fireEvent, screen, waitFor } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function renderControlDetail() {
  document.body.innerHTML = `
    <aside class="sidebar">
      <nav>
        <button type="button">Controls</button>
        <button type="button">Indicators</button>
      </nav>
    </aside>
    <main>
      <article class="detail-page">
        <header class="detail-header"><h2>FRR-CCM-01</h2></header>
        <div class="relationship-summary"></div>
        <section class="detail-section">
          <h3>Referenced rules</h3>
          <div class="relationship-list">
            <button type="button"><code>RULE-001</code><span>Rule statement</span><small>Process A</small></button>
            <button type="button"><code>RULE-002</code><span>Second rule</span><small>Process B</small></button>
          </div>
        </section>
        <section class="detail-section">
          <h3>Referenced indicators</h3>
          <div class="relationship-list">
            <article><code>KSI-001</code><span>Indicator statement</span><small>Identity</small></article>
          </div>
        </section>
        <section class="detail-section">
          <h3>Processes</h3>
          <div class="chip-list"><span>Process A</span><span>Process B</span></div>
        </section>
      </article>
    </main>
  `
}

async function loadViewer() {
  vi.resetModules()
  await import('./relationshipGraph')
  await waitFor(() => expect(document.querySelector('.spider-graph-viewport')).toBeInTheDocument())
}

describe('relationship viewer regression coverage', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    sessionStorage.clear()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.resetModules()
  })

  it('renders the viewer controls on their own row beneath the heading', async () => {
    renderControlDetail()
    await loadViewer()

    const heading = document.querySelector('.spider-graph-heading')
    const actions = document.querySelector('.spider-graph-actions')

    expect(heading).toContainElement(actions)
    expect(heading?.firstElementChild?.nextElementSibling).toBe(actions)
    expect(screen.getByLabelText('Search relationship graph nodes')).toBeInTheDocument()
    expect(screen.getByLabelText('Relationship graph layout')).toBeInTheDocument()
  })

  it('renders all base nodes and preserves them while switching layouts', async () => {
    renderControlDetail()
    await loadViewer()

    const nodesBefore = document.querySelectorAll('.spider-node')
    expect(nodesBefore).toHaveLength(6)

    const layout = screen.getByLabelText('Relationship graph layout') as HTMLSelectElement
    fireEvent.change(layout, { target: { value: 'tree' } })

    expect(document.querySelectorAll('.spider-node')).toHaveLength(6)
    expect(document.querySelector('[data-node-id="FRR-CCM-01"]')).toBeInTheDocument()
    expect(document.querySelector('[data-node-id="RULE-001"]')).toBeInTheDocument()
    expect(document.querySelector('[data-node-id="KSI-001"]')).toBeInTheDocument()
  })

  it('searches nodes, reports matches, and clears the search state', async () => {
    renderControlDetail()
    await loadViewer()

    const search = screen.getByLabelText('Search relationship graph nodes') as HTMLInputElement
    fireEvent.input(search, { target: { value: 'RULE-001' } })

    expect(screen.getByText('1 node found.')).toBeInTheDocument()
    expect(document.querySelector('[data-node-id="RULE-001"]')).toHaveClass('is-search-match')
    expect(document.querySelector('[data-node-id="RULE-002"]')).toHaveClass('is-dimmed')

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(search.value).toBe('')
    expect(document.querySelector('.is-search-match')).not.toBeInTheDocument()
    expect(document.querySelector('.is-dimmed')).not.toBeInTheDocument()
  })

  it('pins a node, preserves its position across layouts, and clears pins', async () => {
    renderControlDetail()
    await loadViewer()

    const ruleNode = document.querySelector<SVGGElement>('[data-node-id="RULE-001"]')!
    const pinButton = ruleNode.querySelector<SVGGElement>('.spider-node-pin')!
    expect(pinButton).toBeInTheDocument()

    fireEvent.click(pinButton)
    expect(ruleNode).toHaveClass('is-pinned')

    const pinnedTransform = ruleNode.getAttribute('transform')
    const layout = screen.getByLabelText('Relationship graph layout') as HTMLSelectElement
    fireEvent.change(layout, { target: { value: 'hierarchical' } })
    expect(ruleNode.getAttribute('transform')).toBe(pinnedTransform)

    fireEvent.click(screen.getByRole('button', { name: 'Clear pins' }))
    expect(ruleNode).not.toHaveClass('is-pinned')
  })
})
