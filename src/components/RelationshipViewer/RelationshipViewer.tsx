import { useMemo, useState } from 'react'
import type { RelationshipEdge, RelationshipNode } from './types'
import './RelationshipViewer.css'

type Props = {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
  selectedId: string
  onNodeClick: (node: RelationshipNode) => void
}

type PositionedNode = RelationshipNode & { x: number; y: number }

export function RelationshipViewer({ nodes, edges, selectedId, onNodeClick }: Props) {
  const [scale, setScale] = useState(1)
  const selected = nodes.find((node) => node.id === selectedId)

  const positioned = useMemo<PositionedNode[]>(() => {
    const centerX = 550
    const centerY = 350
    const others = nodes.filter((node) => node.id !== selectedId)
    return [
      ...(selected ? [{ ...selected, x: centerX, y: centerY }] : []),
      ...others.map((node, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(others.length, 1) - Math.PI / 2
        const radius = 255
        return { ...node, x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius }
      }),
    ]
  }, [nodes, selected, selectedId])

  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned])
  const transform = `translate(${550 * (1 - scale)} ${350 * (1 - scale)}) scale(${scale})`

  return <section className="native-relationship-viewer">
    <div className="native-relationship-toolbar">
      <p>Select a connected rule, indicator, or process to open it.</p>
      <button type="button" onClick={() => setScale(1)}>Fit to view</button>
    </div>
    <svg viewBox="0 0 1100 700" role="img" aria-label={`Relationships for ${selectedId}`} onWheel={(event) => {
      event.preventDefault()
      setScale((current) => Math.min(2.5, Math.max(.55, current * (event.deltaY < 0 ? 1.1 : .9))))
    }}>
      <g transform={transform}>
        {edges.map((edge) => {
          const source = byId.get(edge.source)
          const target = byId.get(edge.target)
          if (!source || !target) return null
          return <line key={`${edge.source}-${edge.target}-${edge.relationship}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} className={`native-edge edge-${target.kind}`} />
        })}
        {positioned.map((node) => {
          const isSelected = node.id === selectedId
          return <g key={`${node.kind}-${node.id}`} transform={`translate(${node.x} ${node.y})`} className={`native-node node-${node.kind}${isSelected ? ' selected' : ''}`} role="button" tabIndex={0} onClick={() => onNodeClick(node)} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onNodeClick(node)
            }
          }}>
            <circle r={isSelected ? 64 : 36} />
            <text textAnchor="middle" y={isSelected ? 4 : 5}>{node.label.length > 18 ? `${node.label.slice(0, 16)}…` : node.label}</text>
            {isSelected && <text className="native-node-subtitle" textAnchor="middle" y="27">{node.kind}</text>}
          </g>
        })}
      </g>
    </svg>
  </section>
}
