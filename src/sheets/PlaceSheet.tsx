import { useNavigate } from 'react-router-dom'
import { ExternalLink, MapPinPlus, Navigation, Sparkles, TriangleAlert } from 'lucide-react'
import { Button, Sheet } from '../components/ui'
import { directionsUrl } from '../lib/geo'
import { PLACE_LABEL, type Place } from '../lib/overpass'

export function PlaceSheet({ place, onClose, onSave }: { place: Place; onClose: () => void; onSave: (p: Place) => void }) {
  const nav = useNavigate()
  const access = place.kind === 'parking' || place.kind === 'bridge' || place.kind === 'fishing'
  return (
    <Sheet
      title={
        <span className="flex flex-col">
          <span>{place.name ?? PLACE_LABEL[place.kind]}</span>
          <span className="text-xs font-medium text-muted">{PLACE_LABEL[place.kind]}</span>
        </span>
      }
      onClose={onClose}
      actions={
        <>
          <a className="inline-flex min-h-11 items-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-on-accent" href={directionsUrl(place)} target="_blank" rel="noreferrer">
            <Navigation size={18} /> Directions
          </a>
          {place.kind !== 'shop' ? (
            <Button onClick={() => nav(`/plan?lat=${place.lat}&lon=${place.lon}`)}>
              <Sparkles size={18} /> What to use here
            </Button>
          ) : null}
          <Button onClick={() => onSave(place)}>
            <MapPinPlus size={18} /> Save as my marker
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-sm">
        {access ? (
          <p className="flex gap-2 rounded-md bg-surface p-3">
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <span>
              <span className="font-semibold">Not verified public access.</span> This comes from OpenStreetMap. Check signs, landowner permission and your state's stream access law before you
              walk in.
            </span>
          </p>
        ) : null}
        <a href={place.osmUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-accent">
          View or fix it on OpenStreetMap <ExternalLink size={14} />
        </a>
      </div>
    </Sheet>
  )
}
