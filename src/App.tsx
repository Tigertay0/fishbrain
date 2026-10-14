import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ToastProvider, useToast } from './components/Toast'
import { TabBar } from './components/TabBar'
import { MapScreen } from './screens/MapScreen'
import { ForecastScreen } from './screens/ForecastScreen'
import { PlanScreen } from './screens/PlanScreen'
import { RigDetailScreen, RigsScreen } from './screens/RigsScreen'
import { LogCatchScreen } from './screens/LogCatchScreen'
import { LogbookScreen } from './screens/LogbookScreen'
import { CatchDetailScreen } from './screens/CatchDetailScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SpeciesScreen } from './screens/SpeciesScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { MoreScreen } from './screens/MoreScreen'
import { backfillPending } from './lib/catches'
import { DAY, pruneCache } from './lib/cache'

function Shell() {
  const { pathname } = useLocation()
  const onMap = pathname === '/'
  const toast = useToast()

  useEffect(() => {
    document.title = TITLES[pathname.split('/')[1] ?? ''] ?? 'Tailout'
  }, [pathname])

  // Catches saved with no signal get their weather when the connection comes back.
  useEffect(() => {
    const run = () =>
      void backfillPending().then((n) => {
        if (n) toast(`Added conditions to ${n} catch${n > 1 ? 'es' : ''} saved offline`)
      })
    run()
    void pruneCache(90 * DAY)
    window.addEventListener('online', run)
    return () => window.removeEventListener('online', run)
  }, [toast])

  return (
    <div className="relative h-dvh overflow-hidden bg-bg">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-raised focus:p-2">
        Skip to content
      </a>
      {/* The map stays mounted across tabs so it never reloads its tiles. */}
      <div className={onMap ? 'absolute inset-0' : 'hidden'} aria-hidden={!onMap} id={onMap ? 'main-content' : undefined}>
        <h1 className="sr-only">Map</h1>
        <MapScreen active={onMap} />
      </div>
      {!onMap ? (
        <div className="absolute inset-0" id="main-content">
          <Routes>
            <Route path="/plan" element={<PlanScreen />} />
            <Route path="/rigs" element={<RigsScreen />} />
            <Route path="/rigs/:id" element={<RigDetailScreen />} />
            <Route path="/forecast" element={<ForecastScreen />} />
            <Route path="/log" element={<LogCatchScreen key="new" />} />
            <Route path="/catch/:id" element={<CatchDetailScreen />} />
            <Route path="/catch/:id/edit" element={<LogCatchScreen />} />
            <Route path="/logbook" element={<LogbookScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/species" element={<SpeciesScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/more" element={<MoreScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      ) : null}
      <TabBar />
    </div>
  )
}

const TITLES: Record<string, string> = {
  '': 'Tailout · Map',
  plan: 'What to use · Tailout',
  rigs: 'Rig guide · Tailout',
  forecast: 'Forecast · Tailout',
  log: 'Log a catch · Tailout',
  catch: 'Catch · Tailout',
  logbook: 'Logbook · Tailout',
  stats: 'Stats · Tailout',
  species: 'Species guide · Tailout',
  settings: 'Settings · Tailout',
  more: 'More · Tailout',
}

export function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ToastProvider>
  )
}
