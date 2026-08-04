import type { NormalizedDataset } from './types'
import { normalizeDataset } from './normalize'

const DATA_URL = 'https://raw.githubusercontent.com/FedRAMP/rules/main/fedramp-consolidated-rules.json'

export async function loadDataset(): Promise<NormalizedDataset> {
  const response = await fetch(DATA_URL, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Unable to load FedRAMP rules (${response.status}).`)
  return normalizeDataset(await response.json())
}

export { DATA_URL }
