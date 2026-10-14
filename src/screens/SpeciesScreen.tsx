import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip, Page } from '../components/ui'
import { PROFILES, type Group } from '../lib/species'
import { RIG_BY_ID } from '../lib/rigs'
import { useSettings } from '../lib/settings'
import { fToC } from '../lib/units'

const GROUPS: { id: string; label: string; groups: Group[] }[] = [
  { id: 'trout', label: 'Trout and grayling', groups: ['trout'] },
  { id: 'bass', label: 'Bass and panfish', groups: ['bass', 'panfish', 'temperate-bass'] },
  { id: 'predators', label: 'Pike, walleye, perch', groups: ['pike', 'perch'] },
  { id: 'bottom', label: 'Catfish and carp', groups: ['catfish', 'carp'] },
  { id: 'coarse', label: 'Coarse fish', groups: ['coarse'] },
]

export function SpeciesScreen() {
  const { units } = useSettings()
  const [tab, setTab] = useState(GROUPS[0].id)
  const groups = GROUPS.find((g) => g.id === tab)!.groups
  const fmt = (f: number) => (units === 'imperial' ? `${f}°F` : `${Math.round(fToC(f))}°C`)
  return (
    <Page title="Species guide">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Group">
        {GROUPS.map((g) => (
          <Chip key={g.id} on={tab === g.id} onClick={() => setTab(g.id)}>
            {g.label}
          </Chip>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {PROFILES.filter((p) => groups.includes(p.group)).map((p) => {
          const t = p.tactics.default
          return (
            <li key={p.id} className="rounded-md bg-raised p-4 shadow-card">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="mb-2 text-xs italic text-muted">{p.latin.slice(0, 2).join(', ')}</p>
              <dl className="flex flex-col gap-2 text-sm">
                <div>
                  <dt className="font-semibold">How to tell</dt>
                  <dd>{p.idTips}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Water temperature</dt>
                  <dd>
                    Best {fmt(p.tempF.best[0])}–{fmt(p.tempF.best[1])}, active {fmt(p.tempF.active[0])}–{fmt(p.tempF.active[1])}
                    {p.tempF.spawn ? `; spawns around ${fmt(p.tempF.spawn[0])}–${fmt(p.tempF.spawn[1])} in ${p.tempF.spawnSeason}` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Where</dt>
                  <dd>{t.still ?? t.moving}</dd>
                </div>
                <div>
                  <dt className="font-semibold">How</dt>
                  <dd>{t.how}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Rigs</dt>
                  <dd className="flex flex-wrap gap-x-3">
                    {t.rigs.slice(0, 4).map((id) => (
                      <Link key={id} to={`/rigs/${id}`} className="font-semibold text-accent underline">
                        {RIG_BY_ID[id].name}
                      </Link>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">Tackle</dt>
                  <dd>
                    {p.tackle.line}; {p.tackle.hooks}
                  </dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted">Temperatures are approximate. Always check your local regulations for seasons, limits and bait rules.</p>
    </Page>
  )
}
