import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DATA_URL, SCHEMA_URL, loadDataset } from './load'

const validSchema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
  required: ['info', 'definitions', 'processes', 'indicators'],
  properties: {
    info: {
      type: 'object',
      required: ['title', 'description', 'version', 'last_updated'],
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        version: { type: 'string' },
        last_updated: { type: 'string' },
      },
    },
    definitions: { type: 'array' },
    processes: { type: 'array' },
    indicators: { type: 'array' },
  },
}

const validDataset = {
  info: {
    title: 'FedRAMP Consolidated Rules',
    description: 'Test dataset',
    version: 'test',
    last_updated: '2026-01-01',
  },
  definitions: [],
  processes: [],
  indicators: [],
}

function response(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response)
}

describe('FedRAMP source loading and validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('fetches the official dataset and schema, validates them, and records hashes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementation((url) => url === DATA_URL ? response(validDataset) : response(validSchema))

    const result = await loadDataset()

    expect(fetchMock).toHaveBeenCalledWith(DATA_URL, { cache: 'no-store' })
    expect(fetchMock).toHaveBeenCalledWith(SCHEMA_URL, { cache: 'no-store' })
    expect(result.status.source).toBe('official')
    expect(result.status.validation).toBe('passed')
    expect(result.status.sourceIntegrity).toBe('exact-source-bytes')
    expect(result.status.datasetSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.status.schemaSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('rejects an official dataset that fails schema validation when no cache exists', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementation((url) => url === DATA_URL ? response({ invalid: true }) : response(validSchema))

    await expect(loadDataset()).rejects.toThrow('failed schema validation')
  })

  it('falls back to the last validated hash-verified cache when the official source is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementation((url) => url === DATA_URL ? response(validDataset) : response(validSchema))
    const first = await loadDataset()
    expect(first.status.source).toBe('official')

    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => response('', false, 503))
    const cached = await loadDataset()

    expect(cached.status.source).toBe('cache')
    expect(cached.status.validation).toBe('passed')
    expect(cached.status.warning).toContain('last validated')
    expect(cached.status.datasetSha256).toBe(first.status.datasetSha256)
    expect(cached.status.schemaSha256).toBe(first.status.schemaSha256)
  })

  it('rejects a cache whose exact source bytes no longer match the stored hash', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementation((url) => url === DATA_URL ? response(validDataset) : response(validSchema))
    await loadDataset()

    const key = 'fedramp-rules-explorer:last-known-valid-v2'
    const cached = JSON.parse(localStorage.getItem(key) ?? '{}')
    cached.rawDataset = `${cached.rawDataset} `
    localStorage.setItem(key, JSON.stringify(cached))

    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => response('', false, 503))

    await expect(loadDataset()).rejects.toThrow('cache integrity verification failed')
  })
})
