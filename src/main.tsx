import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Offline support. A new version waits until the user agrees, so a refresh never
// lands mid-way through logging a catch.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const update = registerSW({
      onNeedRefresh() {
        const bar = document.createElement('div')
        bar.setAttribute('role', 'status')
        bar.className = 'fixed inset-x-2 top-2 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md bg-text px-4 py-3 text-sm font-semibold text-bg shadow-pop'
        bar.innerHTML = '<span class="flex-1">A new version is ready.</span>'
        const btn = document.createElement('button')
        btn.className = 'rounded-md bg-accent px-3 py-2 text-on-accent'
        btn.textContent = 'Reload'
        btn.onclick = () => void update(true)
        bar.appendChild(btn)
        document.body.appendChild(bar)
      },
    })
  })
}
