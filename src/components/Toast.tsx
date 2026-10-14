import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastMsg = { id: number; text: string; kind: 'info' | 'error' }
const Ctx = createContext<(text: string, kind?: ToastMsg['kind']) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([])
  const push = useCallback((text: string, kind: ToastMsg['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((xs) => [...xs.slice(-2), { id, text, kind }])
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000)
  }, [])
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md rounded-md px-4 py-3 text-sm font-semibold shadow-pop ${
              t.kind === 'error' ? 'bg-danger text-on-accent' : 'bg-text text-bg'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
