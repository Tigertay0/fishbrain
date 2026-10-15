import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CloudSun, Fish, Sparkles } from 'lucide-react'
import { Button, DirectionsLink, Sheet } from '../components/ui'
import { loadSpeciesNear } from '../lib/publicdata'
import type { Presence } from '../lib/advisor'

export type WaterHit = { name?: string; kind: string; lat: number; lon: number }

export function WaterSheet({ hit, onClose }: { hit: WaterHit; onClose: () => void }) {
  const nav = useNavigate()
  const [fish, setFish] = useState<Presence[] | 'loading' | 'error'>('loading')
  useEffect(() => {
    let live = true
    setFish('loading')
    loadSpeciesNear(hit.lat, hit.lon, 2)
      .then((r) => live && setFish(r.data))
      .catch(() => live && setFish('error'))
    return () => {
      live = false
    }
  }, [hit.lat, hit.lon])

  const salt = hit.kind === 'ocean'
  const kind = salt ? 'Sea or bay' : hit.kind === 'river' ? 'River' : 'Lake or pond'
  const q = `lat=${hit.lat}&lon=${hit.lon}${hit.name ? `&name=${encodeURIComponent(hit.name)}` : ''}${salt ? '&type=coast' : ''}`
  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{hit.name ?? `Unnamed ${kind.toLowerCase()}`}</span>
          <span className="text-xs font-medium text-muted">{kind}</span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" onClick={() => nav(`/plan?${q}`)}>
            <Sparkles size={18} /> What to use here
          </Button>
          <Button onClick={() => nav(`/log?${q.replace('name=', 'water=')}`)}>
            <Fish size={18} /> Log a catch
          </Button>
          <Button onClick={() => nav(`/forecast?${q}`)}>
            <CloudSun size={18} /> Forecast
          </Button>
          <DirectionsLink point={hit} />
        </>
      }
    >
      <section aria-label="Fish recorded here" className="text-sm">
        <h3 className="mb-1 font-semibold">Fish recorded within 2 km</h3>
        {fish === 'loading' ? <div className="skeleton h-10" role="status" aria-label="Loading" /> : null}
        {fish === 'error' ? <p className="text-muted">Public records unavailable right now.</p> : null}
        {Array.isArray(fish) ? (
          fish.length ? (
            <p>
              {fish
                .slice(0, 6)
                .map((f) => `${f.common} (${f.count})`)
                .join(', ')}
            </p>
          ) : (
            <p className="text-muted">No public records yet. The plan will fall back to what usually lives in water like this.</p>
          )
        ) : null}
        <p className="mt-2 text-xs text-muted">Research-grade iNaturalist observations from the last 10 years.</p>
      </section>
    </Sheet>
  )
}
