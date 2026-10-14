import { Link } from 'react-router-dom'
import { BarChart3, BookOpen, ChevronRight, CloudSun, Download, Settings, Waypoints } from 'lucide-react'
import { Button, Page } from '../components/ui'
import { isIOS, isStandalone, promptInstall, useCanInstall } from '../lib/install'

const LINKS = [
  { to: '/forecast', label: 'Forecast and bite times', icon: CloudSun },
  { to: '/rigs', label: 'Rig guide', icon: Waypoints },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/species', label: 'Species guide', icon: BookOpen },
  { to: '/settings', label: 'Settings and backup', icon: Settings },
]

export function MoreScreen() {
  const canInstall = useCanInstall()
  return (
    <Page title="More">
      <ul className="flex flex-col overflow-hidden rounded-md bg-raised shadow-card">
        {LINKS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="border-b border-border last:border-0">
            <Link to={to} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface">
              <Icon size={20} className="text-accent" aria-hidden />
              <span className="flex-1 font-semibold">{label}</span>
              <ChevronRight size={18} className="text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      {!isStandalone() ? (
        <section className="flex flex-col gap-2 rounded-md bg-surface p-4" aria-label="Install">
          <h2 className="font-semibold">Install Tailout</h2>
          <p className="text-sm">Installed, it opens full screen, works with no signal, and the browser is less likely to clear your logbook.</p>
          {canInstall ? (
            <Button variant="primary" onClick={() => void promptInstall()}>
              <Download size={18} /> Install app
            </Button>
          ) : isIOS() ? (
            <p className="text-sm">In Safari, tap Share, then “Add to Home Screen”.</p>
          ) : (
            <p className="text-sm text-muted">Use your browser's menu: “Install app” or “Add to Home screen”.</p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-2 text-sm" aria-label="About">
        <h2 className="font-semibold">About</h2>
        <p>
          Free public data, one map: USGS gauges, OpenStreetMap waters and places, iNaturalist fish records, state stocking reports, French national fish surveys, Open-Meteo weather. Your catches, photos, markers and notes never leave this device. No account,
          no ads, no review pop-ups.
        </p>
        <p className="text-xs text-muted">
          Data: U.S. Geological Survey (public domain) · © OpenStreetMap contributors (ODbL) · iNaturalist observers (per-record licences) · OFB / Hub'Eau · Montana FWP, WDFW, NYSDEC, MassWildlife · OpenFreeMap / OpenMapTiles · Open-Meteo (CC BY 4.0) · USGS The National Map. Icons: Lucide.
        </p>
      </section>
    </Page>
  )
}
