import { useNavigate } from 'react-router-dom'
import { ExternalLink, Navigation, Sparkles } from 'lucide-react'
import { Button, Sheet } from '../components/ui'
import { directionsUrl } from '../lib/geo'
import { formatDate } from '../lib/format'
import { licenseLabel, type Sighting } from '../lib/publicdata'
import { profileForLatin } from '../lib/species'

export function SightingSheet({ sighting: s, onClose }: { sighting: Sighting; onClose: () => void }) {
  const nav = useNavigate()
  const profile = profileForLatin(s.latin)
  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{s.common}</span>
          <span className="text-xs font-medium italic text-muted">{s.latin}</span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <Button variant="primary" onClick={() => nav(`/plan?lat=${s.lat}&lon=${s.lon}${profile ? `&target=${profile.id}` : ''}`)}>
            <Sparkles size={18} /> What to use here
          </Button>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-accent" href={directionsUrl(s)} target="_blank" rel="noreferrer">
            <Navigation size={18} /> Directions
          </a>
        </>
      }
    >
      <div className="flex flex-col gap-2 text-sm">
        <p>
          Recorded {s.date ? formatDate(s.date) : 'on an unknown date'}
          {s.observer ? ` by ${s.observer}` : ''}. Identification confirmed by the iNaturalist community.
        </p>
        <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent">
          See the record and photos <ExternalLink size={14} />
        </a>
        <p className="text-xs text-muted">
          © {s.observer ?? 'observer'}, {licenseLabel(s.license)}, via iNaturalist. A record means the fish was here once, not that it’s here today, and says nothing about
          access: check that you can fish here legally.
        </p>
      </div>
    </Sheet>
  )
}
