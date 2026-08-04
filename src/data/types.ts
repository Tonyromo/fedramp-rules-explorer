export type Applicability = 'all' | '20x' | 'rev5'

export interface DatasetInfo {
  title: string
  description: string
  version: string
  last_updated: string
}

export interface DefinitionRecord {
  id: string
  term: string
  definition: string
  note?: string
  tag?: string
  alts?: string[]
  reference?: string
  reference_url?: string
  applicability: Applicability
  sourcePath: string
}

export interface RuleRecord {
  id: string
  processId: string
  processName: string
  subset: string
  applicability: Applicability
  force: string
  statement: string
  controls: string[]
  artifacts: string[]
  terms: string[]
  relatedRules: string[]
  sourcePath: string
}

export interface IndicatorRecord {
  id: string
  themeId: string
  themeName: string
  statement: string
  controls: string[]
  artifacts: string[]
  terms: string[]
  sourcePath: string
}

export interface NormalizedDataset {
  info: DatasetInfo
  definitions: DefinitionRecord[]
  rules: RuleRecord[]
  indicators: IndicatorRecord[]
}
