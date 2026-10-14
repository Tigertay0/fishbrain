import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Chip, EmptyState, Page } from '../components/ui'
import { RigDiagram } from '../components/RigDiagram'
import { RIG_BY_ID, RIGS, type Method, type RigId } from '../lib/rigs'

const METHOD_LABEL: Record<Method, string> = { bait: 'Bait', lure: 'Lures', fly: 'Fly' }

export function RigsScreen() {
  const [method, setMethod] = useState<Method | null>(null)
  const shown = RIGS.filter((r) => !method || r.methods.includes(method))
  return (
    <Page title="Rig guide">
      <div className="flex gap-2" role="group" aria-label="Filter by method">
        <Chip on={method === null} onClick={() => setMethod(null)}>
          All
        </Chip>
        {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
          <Chip key={m} on={method === m} onClick={() => setMethod(method === m ? null : m)}>
            {METHOD_LABEL[m]}
          </Chip>
        ))}
      </div>
      <ul className="flex flex-col overflow-hidden rounded-md bg-raised shadow-card">
        {shown.map((r) => (
          <li key={r.id} className="border-b border-border last:border-0">
            <Link to={`/rigs/${r.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface">
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{r.name}</span>
                <span className="text-sm text-muted">{r.summary}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export function RigDetailScreen() {
  const { id } = useParams()
  const rig = RIG_BY_ID[id as RigId]
  if (!rig)
    return (
      <Page title="Rig">
        <EmptyState icon={null} title="No such rig">
          <Link to="/rigs" className="font-semibold text-accent underline">
            All rigs
          </Link>
        </EmptyState>
      </Page>
    )
  return (
    <Page title={rig.name}>
      <p>{rig.summary}</p>
      <p className="rounded-md bg-surface p-3 text-sm">
        <span className="font-semibold">Use it for: </span>
        {rig.when}
      </p>
      <section aria-label="Diagram" className="rounded-md bg-raised p-3 shadow-card">
        <RigDiagram rig={rig} />
        <p className="text-xs text-muted">Top is the rod end; bottom is where the fish bites. Not to scale.</p>
      </section>
      <section aria-label="How to tie it">
        <h2 className="mb-2 text-base font-semibold">How to set it up</h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          {rig.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      {rig.tips.length ? (
        <section aria-label="Tips" className="text-sm">
          <h2 className="mb-1 text-base font-semibold">Tips</h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {rig.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <Link to="/rigs" className="text-sm font-semibold text-accent underline">
        All rigs
      </Link>
    </Page>
  )
}
