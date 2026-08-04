import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { NormalizedDataset } from './types'
import { normalizeDataset } from './normalize'

const DATA_URL = 'https://raw.githubusercontent.com/FedRAMP/rules/main/fedramp-consolidated-rules.json'
const SCHEMA_URL = 'https://raw.githubusercontent.com/FedRAMP/rules/main/schemas/fedramp-consolidated-rules.schema.json'
const CACHE_KEY = 'fedramp-rules-explorer:last-known-valid'

interface CachedSource {
  dataset: unknown
  schema: object
  retrievedAt: string
}

export interface DatasetLoadStatus {
  source: 'official' | 'cache'
  retrievedAt: string
  validation: 'passed'
  warning?: string
}

export interface DatasetLoadResult {
  data: NormalizedDataset
  status: DatasetLoadStatus
}

function validateDataset(dataset: unknown, schema: object): void {
  const ajv = new Ajv2020({ allErrors: true, strict: false })
  addFormats(ajv)
  const validate = ajv.compile(schema)

  if (!validate(dataset)) {
    const details = ajv.errorsText(validate.errors, { separator: '; ' })
    throw new Error(`The official FedRAMP dataset failed schema validation: ${details}`)
  }
}

function readCache(): CachedSource | null {
  try {
    const value = localStorage.getItem(CACHE_KEY)
    return value ? JSON.parse(value) as CachedSource : null
  } catch {
    return null
  }
}

function writeCache(value: CachedSource): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Storage may be disabled or full. Live data remains usable.
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`)
  return response.json()
}

export async function loadDataset(): Promise<DatasetLoadResult> {
  try {
    const [dataset, schema] = await Promise.all([
      fetchJson(DATA_URL),
      fetchJson(SCHEMA_URL),
    ])

    validateDataset(dataset, schema as object)
    const retrievedAt = new Date().toISOString()
    writeCache({ dataset, schema: schema as object, retrievedAt })

    return {
      data: normalizeDataset(dataset),
      status: { source: 'official', retrievedAt, validation: 'passed' },
    }
  } catch (cause) {
    const cached = readCache()
    if (!cached) {
      const message = cause instanceof Error ? cause.message : 'Unknown loading error.'
      throw new Error(`Unable to load a valid FedRAMP dataset. ${message}`)
    }

    validateDataset(cached.dataset, cached.schema)
    return {
      data: normalizeDataset(cached.dataset),
      status: {
        source: 'cache',
        retrievedAt: cached.retrievedAt,
        validation: 'passed',
        warning: 'The official FedRAMP source could not be reached. Showing the last validated local cache.',
      },
    }
  }
}

export { DATA_URL, SCHEMA_URL }
