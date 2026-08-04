export type RelationshipNodeKind = 'control' | 'rule' | 'indicator' | 'process'

export type RelationshipNode = {
  id: string
  label: string
  kind: RelationshipNodeKind
  metadata?: string
}

export type RelationshipEdge = {
  source: string
  target: string
  relationship: string
}
