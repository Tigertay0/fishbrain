import type { PartKind, Rig } from '../lib/rigs'

const ROW = 34
const CX = 44 // the line runs down this x

/** A schematic of a rig, top (rod) to bottom (fish), drawn with the theme's colours. */
export function RigDiagram({ rig }: { rig: Rig }) {
  const h = rig.parts.length * ROW + 8
  return (
    <svg viewBox={`0 0 320 ${h}`} className="w-full max-w-sm" role="img" aria-label={`Diagram of a ${rig.name}: ${rig.parts.map((p) => p.label).join(', then ')}`}>
      <line x1={CX} y1={0} x2={CX} y2={h - 18} stroke="var(--tl-text-muted)" strokeWidth="1.5" />
      {rig.parts.map((p, i) => {
        const y = i * ROW + ROW / 2 + 2
        return (
          <g key={i}>
            <Glyph kind={p.kind} y={y} />
            <text x={CX + 34} y={y + 4} fontSize="12" fill="var(--tl-text)">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Glyph({ kind, y }: { kind: PartKind; y: number }) {
  const ink = 'var(--tl-text)'
  const accent = 'var(--tl-accent)'
  const lead = 'var(--tl-text-muted)'
  const paper = 'var(--tl-raised)'
  switch (kind) {
    case 'line':
      return <line x1={CX} y1={y - 12} x2={CX} y2={y + 12} stroke="var(--tl-water)" strokeWidth="2" strokeDasharray="4 3" />
    case 'bobber':
      return (
        <g>
          <circle cx={CX} cy={y} r="11" fill={paper} stroke={ink} strokeWidth="1.5" />
          <path d={`M${CX - 11} ${y} a11 11 0 0 1 22 0 z`} fill={accent} />
        </g>
      )
    case 'slipbobber':
      return (
        <g>
          <ellipse cx={CX} cy={y} rx="7" ry="14" fill={paper} stroke={ink} strokeWidth="1.5" />
          <path d={`M${CX - 7} ${y} a7 14 0 0 1 14 0 z`} fill={accent} />
        </g>
      )
    case 'stop':
      return <rect x={CX - 5} y={y - 3} width="10" height="6" rx="2" fill={ink} />
    case 'bead':
      return <circle cx={CX} cy={y} r="4.5" fill={accent} />
    case 'splitshot':
      return <circle cx={CX} cy={y} r="5" fill={lead} />
    case 'swivel':
      return (
        <g fill="none" stroke={ink} strokeWidth="1.5">
          <circle cx={CX} cy={y - 6} r="3.5" />
          <rect x={CX - 3} y={y - 3} width="6" height="6" rx="1" fill={ink} />
          <circle cx={CX} cy={y + 6} r="3.5" />
        </g>
      )
    case 'snap':
      return <path d={`M${CX} ${y - 10} v6 a5 7 0 1 0 0.1 0`} fill="none" stroke={ink} strokeWidth="1.5" />
    case 'egg':
      return <ellipse cx={CX} cy={y} rx="7" ry="10" fill={lead} />
    case 'bullet':
      return <path d={`M${CX} ${y - 11} L${CX + 7} ${y + 8} L${CX - 7} ${y + 8} Z`} fill={lead} />
    case 'bell':
      return <path d={`M${CX} ${y - 10} C${CX + 9} ${y - 2} ${CX + 9} ${y + 10} ${CX} ${y + 10} C${CX - 9} ${y + 10} ${CX - 9} ${y - 2} ${CX} ${y - 10} Z`} fill={lead} />
    case 'jighead':
      return (
        <g>
          <circle cx={CX} cy={y - 3} r="7" fill={accent} />
          <path d={`M${CX + 3} ${y + 3} q10 6 2 12`} fill="none" stroke={ink} strokeWidth="1.5" />
        </g>
      )
    case 'hook':
      return <path d={`M${CX} ${y - 12} V${y + 4} a6 6 0 0 1 -12 0 l3 -3`} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    case 'circle':
      return <path d={`M${CX} ${y - 12} V${y - 2} a8 8 0 1 1 -10 -3`} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
    case 'treble':
      return (
        <g fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round">
          <path d={`M${CX} ${y - 12} V${y + 4}`} />
          <path d={`M${CX} ${y + 4} a5 5 0 0 1 -10 0`} />
          <path d={`M${CX} ${y + 4} a5 5 0 0 0 10 0`} />
          <path d={`M${CX} ${y + 4} v6`} />
        </g>
      )
    case 'lure':
      return <path d={`M${CX} ${y - 10} C${CX + 10} ${y - 4} ${CX + 6} ${y + 8} ${CX} ${y + 12} C${CX - 6} ${y + 8} ${CX - 10} ${y - 4} ${CX} ${y - 10} Z`} fill={accent} opacity="0.85" />
    case 'spinner':
      return (
        <g>
          <ellipse cx={CX + 7} cy={y - 4} rx="6" ry="9" fill={lead} transform={`rotate(20 ${CX + 7} ${y - 4})`} />
          <rect x={CX - 2} y={y - 6} width="4" height="14" rx="2" fill={accent} />
        </g>
      )
    case 'indicator':
      return <circle cx={CX} cy={y} r="8" fill={accent} />
    case 'dryfly':
      return (
        <g stroke={ink} strokeWidth="1.5">
          <line x1={CX - 10} y1={y - 6} x2={CX + 10} y2={y - 6} />
          <rect x={CX - 3} y={y - 4} width="6" height="12" rx="2" fill={accent} />
        </g>
      )
    case 'nymph':
      return (
        <g>
          <circle cx={CX} cy={y - 7} r="3.5" fill="#c8a24a" />
          <rect x={CX - 3} y={y - 4} width="6" height="13" rx="3" fill={ink} />
        </g>
      )
    case 'bouncer':
      return (
        <g stroke={ink} strokeWidth="1.5" fill="none">
          <path d={`M${CX} ${y - 12} V${y} H${CX + 14}`} />
          <path d={`M${CX} ${y} V${y + 12}`} />
          <rect x={CX - 3} y={y + 2} width="6" height="9" rx="2" fill={lead} stroke="none" />
        </g>
      )
    case 'harness':
      return (
        <g>
          <ellipse cx={CX + 6} cy={y - 7} rx="4" ry="6" fill={lead} />
          <circle cx={CX} cy={y} r="2.5" fill={accent} />
          <path d={`M${CX} ${y + 3} q-8 4 0 10`} fill="none" stroke="#7a5236" strokeWidth="3" />
        </g>
      )
    case 'wire':
      return <line x1={CX} y1={y - 12} x2={CX} y2={y + 12} stroke={ink} strokeWidth="2.5" />
    case 'feeder':
      return <rect x={CX - 7} y={y - 11} width="14" height="22" rx="3" fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="3 2" />
    case 'hair':
      return (
        <g>
          <path d={`M${CX - 4} ${y - 10} q6 8 0 12`} fill="none" stroke={ink} strokeWidth="1" />
          <circle cx={CX - 4} cy={y + 5} r="5" fill="#e3b341" />
        </g>
      )
  }
}
