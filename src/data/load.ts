import Ajv2020 from 'ajv/dist/2020'
import addFormats from 'ajv-formats'
import type { NormalizedDataset } from './types'
import { normalizeDataset } from './normalize'

const DATA_URL = 'https://raw.githubusercontent.com/FedRAMP/rules/main/fedramp-consolidated-rules.json'
const SCHEMA_URL = 'https://raw.githubusercontent.com/FedRAMP/rules/main/schemas/fedramp-consolidated-rules.schema.json'
const CACHE_KEY = 'fedramp-rules-explorer:last-known-valid-v2'

interface CachedSource {
  rawDataset: string
  rawSchema: string
  datasetSha256: string
  schemaSha256: string
  retrievedAt: string
}

export interface DatasetLoadStatus {
  source: 'official' | 'cache'
  retrievedAt: string
  validation: 'passed'
  datasetSha256: string
  schemaSha256: string
  sourceIntegrity: 'exact-source-bytes'
  warning?: string
}

export interface DatasetLoadResult {
  data: NormalizedDataset
  status: DatasetLoadStatus
}

function parseJson(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${label} is not valid JSON.`)
  }
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

async function sha256(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function readCache(): CachedSource | null {
  try {
    const value = localStorage.getItem(CACHE_KEY)
    if (!value) return null
    const cached = JSON.parse(value) as Partial<CachedSource>
    return typeof cached.rawDataset === 'string' &&
      typeof cached.rawSchema === 'string' &&
      typeof cached.datasetSha256 === 'string' &&
      typeof cached.schemaSha256 === 'string' &&
      typeof cached.retrievedAt === 'string'
      ? cached as CachedSource
      : null
  } catch {
    return null
  }
}

function writeCache(value: CachedSource): void {
  try {
    // Preserve the exact upstream response text. The cached source is never
    // re-serialized, reformatted, corrected, or otherwise rewritten.
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Storage may be disabled or full. Live data remains usable.
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}.`)
  return response.text()
}

async function verifyCachedHash(raw: string, expected: string, label: string): Promise<void> {
  const actual = await sha256(raw)
  if (actual !== expected) throw new Error(`${label} cache integrity verification failed.`)
}

export async function loadDataset(): Promise<DatasetLoadResult> {
  try {
    const [rawDataset, rawSchema] = await Promise.all([
      fetchText(DATA_URL),
      fetchText(SCHEMA_URL),
    ])

    const dataset = parseJson(rawDataset, 'The official FedRAMP dataset')
    const schema = parseJson(rawSchema, 'The official FedRAMP schema')
    validateDataset(dataset, schema as object)

    const [datasetSha256, schemaSha256] = await Promise.all([
      sha256(rawDataset),
      sha256(rawSchema),
    ])
    const retrievedAt = new Date().toISOString()

    writeCache({ rawDataset, rawSchema, datasetSha256, schemaSha256, retrievedAt })

    return {
      data: normalizeDataset(dataset),
      status: {
        source: 'official',
        retrievedAt,
        validation: 'passed',
        datasetSha256,
        schemaSha256,
        sourceIntegrity: 'exact-source-bytes',
      },
    }
  } catch (cause) {
    const cached = readCache()
    if (!cached) {
      const message = cause instanceof Error ? cause.message : 'Unknown loading error.'
      throw new Error(`Unable to load a valid FedRAMP dataset. ${message}`)
    }

    await Promise.all([
      verifyCachedHash(cached.rawDataset, cached.datasetSha256, 'Dataset'),
      verifyCachedHash(cached.rawSchema, cached.schemaSha256, 'Schema'),
    ])

    const dataset = parseJson(cached.rawDataset, 'The cached FedRAMP dataset')
    const schema = parseJson(cached.rawSchema, 'The cached FedRAMP schema')
    validateDataset(dataset, schema as object)

    return {
      data: normalizeDataset(dataset),
      status: {
        source: 'cache',
        retrievedAt: cached.retrievedAt,
        validation: 'passed',
        datasetSha256: cached.datasetSha256,
        schemaSha256: cached.schemaSha256,
        sourceIntegrity: 'exact-source-bytes',
        warning: 'The official FedRAMP source could not be reached. Showing the last validated, hash-verified local cache.',
      },
    }
  }
}

export { DATA_URL, SCHEMA_URL }
