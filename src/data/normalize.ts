import type {
  Applicability,
  DefinitionRecord,
  IndicatorRecord,
  NormalizedDataset,
  RuleRecord,
} from './types'

const text = (value: unknown): string => (typeof value === 'string' ? value : '')
const list = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function flattenStatement(entry: Record<string, unknown>): { statement: string; force: string } {
  if (typeof entry.statement === 'string') {
    return { statement: entry.statement, force: text(entry.force) }
  }

  const variants = entry.varies_by_class
  if (!variants || typeof variants !== 'object') return { statement: '', force: '' }

  const parts = Object.entries(variants as Record<string, unknown>)
    .filter(([, value]) => value && typeof value === 'object')
    .map(([classKey, value]) => {
      const variant = value as Record<string, unknown>
      const statement = text(variant.statement)
      const force = text(variant.force)
      return statement ? `Class ${classKey.toUpperCase()}: ${force} ${statement}`.trim() : ''
    })
    .filter(Boolean)

  return { statement: parts.join('\n\n'), force: 'VARIES BY CLASS' }
}

function normalizeDefinitions(frd: Record<string, unknown> | undefined): DefinitionRecord[] {
  const data = frd?.data
  if (!data || typeof data !== 'object') return []

  const records: DefinitionRecord[] = []
  for (const applicability of ['all', '20x', 'rev5'] as Applicability[]) {
    const bucket = (data as Record<string, unknown>)[applicability]
    if (!bucket || typeof bucket !== 'object') continue

    for (const [id, raw] of Object.entries(bucket as Record<string, unknown>)) {
      if (!raw || typeof raw !== 'object') continue
      const item = raw as Record<string, unknown>
      records.push({
        id,
        term: text(item.term),
        definition: text(item.definition),
        note: text(item.note) || undefined,
        tag: text(item.tag) || undefined,
        alts: list(item.alts),
        reference: text(item.reference) || undefined,
        reference_url: text(item.reference_url) || undefined,
        applicability,
        sourcePath: `FRD.data.${applicability}.${id}`,
      })
    }
  }
  return records
}

function normalizeRules(frr: Record<string, unknown> | undefined): RuleRecord[] {
  if (!frr) return []
  const records: RuleRecord[] = []

  for (const [processId, rawProcess] of Object.entries(frr)) {
    if (!rawProcess || typeof rawProcess !== 'object') continue
    const process = rawProcess as Record<string, unknown>
    const info = process.info as Record<string, unknown> | undefined
    const data = process.data as Record<string, unknown> | undefined
    if (!data) continue

    for (const applicability of ['all', '20x', 'rev5'] as Applicability[]) {
      const bucket = data[applicability]
      if (!bucket || typeof bucket !== 'object') continue

      for (const [subset, rawSubset] of Object.entries(bucket as Record<string, unknown>)) {
        if (!rawSubset || typeof rawSubset !== 'object') continue
        for (const [id, rawRule] of Object.entries(rawSubset as Record<string, unknown>)) {
          if (!rawRule || typeof rawRule !== 'object') continue
          const rule = rawRule as Record<string, unknown>
          const flattened = flattenStatement(rule)
          records.push({
            id,
            processId,
            processName: text(info?.name) || processId,
            subset,
            applicability,
            force: flattened.force,
            statement: flattened.statement,
            controls: list(rule.controls),
            artifacts: list(rule.artifacts),
            terms: list(rule.terms),
            relatedRules: list(rule.related_rules),
            sourcePath: `FRR.${processId}.data.${applicability}.${subset}.${id}`,
          })
        }
      }
    }
  }

  return records
}

function normalizeIndicators(ksi: Record<string, unknown> | undefined): IndicatorRecord[] {
  if (!ksi) return []
  const records: IndicatorRecord[] = []

  for (const [themeId, rawTheme] of Object.entries(ksi)) {
    if (!rawTheme || typeof rawTheme !== 'object') continue
    const theme = rawTheme as Record<string, unknown>
    const indicators = theme.indicators
    if (!indicators || typeof indicators !== 'object') continue

    for (const [id, rawIndicator] of Object.entries(indicators as Record<string, unknown>)) {
      if (!rawIndicator || typeof rawIndicator !== 'object') continue
      const indicator = rawIndicator as Record<string, unknown>
      records.push({
        id,
        themeId,
        themeName: text(theme.name) || themeId,
        statement: flattenStatement(indicator).statement,
        controls: list(indicator.controls),
        artifacts: list(indicator.artifacts),
        terms: list(indicator.terms),
        sourcePath: `KSI.${themeId}.indicators.${id}`,
      })
    }
  }

  return records
}

export function normalizeDataset(source: unknown): NormalizedDataset {
  if (!source || typeof source !== 'object') throw new Error('FedRAMP dataset is not a JSON object.')
  const root = source as Record<string, unknown>
  const info = root.info as Record<string, unknown> | undefined

  return {
    info: {
      title: text(info?.title) || 'FedRAMP Consolidated Rules',
      description: text(info?.description),
      version: text(info?.version) || 'Unknown',
      last_updated: text(info?.last_updated) || 'Unknown',
    },
    definitions: normalizeDefinitions(root.FRD as Record<string, unknown> | undefined),
    rules: normalizeRules(root.FRR as Record<string, unknown> | undefined),
    indicators: normalizeIndicators(root.KSI as Record<string, unknown> | undefined),
  }
}
