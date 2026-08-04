import type { NormalizedDataset, RuleRecord, IndicatorRecord } from './types'

export interface ControlRelationship {
  id: string
  family: string
  rules: RuleRecord[]
  indicators: IndicatorRecord[]
  processes: string[]
}

export function buildControlRelationships(data: NormalizedDataset): ControlRelationship[] {
  const controlIds = new Set<string>()
  data.rules.forEach((rule) => rule.controls.forEach((id) => controlIds.add(id)))
  data.indicators.forEach((indicator) => indicator.controls.forEach((id) => controlIds.add(id)))

  return [...controlIds].sort().map((id) => {
    const rules = data.rules.filter((rule) => rule.controls.includes(id))
    const indicators = data.indicators.filter((indicator) => indicator.controls.includes(id))
    return {
      id,
      family: id.split('-')[0] ?? id,
      rules,
      indicators,
      processes: [...new Set(rules.map((rule) => rule.processId))].sort(),
    }
  })
}
