import { useState } from 'react'
import { Chip, Page } from '../components/ui'
import { SPECIES } from '../lib/species'
import { useSettings } from '../lib/settings'
import { fToC } from '../lib/units'

export function SpeciesScreen() {
  const { units } = useSettings()
  const [group, setGroup] = useState<'trout' | 'other'>('trout')
  const fmt = (f: number) => (units === 'imperial' ? `${f}°F` : `${Math.round(fToC(f))}°C`)
  return (
    <Page title="Species guide">
      <div className="flex gap-2" role="group" aria-label="Group">
        <Chip on={group === 'trout'} onClick={() => setGroup('trout')}>
          Trout and char
        </Chip>
        <Chip on={group === 'other'} onClick={() => setGroup('other')}>
          Other gamefish
        </Chip>
      </div>
      <ul className="flex flex-col gap-3">
        {SPECIES.filter((s) => s.group === group).map((s) => (
          <li key={s.id} className="rounded-md bg-raised p-4 shadow-card">
            <h2 className="text-lg font-semibold">{s.name}</h2>
            <p className="mb-2 text-xs italic text-muted">{s.latin}</p>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="font-semibold">How to tell</dt>
                <dd>{s.id_tips}</dd>
              </div>
              <div>
                <dt className="font-semibold">Where</dt>
                <dd>{s.range}</dd>
              </div>
              <div>
                <dt className="font-semibold">Preferred water</dt>
                <dd>
                  About {fmt(s.tempF[0])}–{fmt(s.tempF[1])}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">How to fish it</dt>
                <dd>{s.tactics}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Ranges are approximate. Always check your state's regulations for seasons, limits and protected waters.</p>
    </Page>
  )
}
