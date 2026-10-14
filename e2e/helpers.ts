import { expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Fails the test on any console error or 5xx, as replica-test asks. */
export function guard(page: Page, allow: RegExp[] = []) {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !allow.some((r) => r.test(msg.text()))) problems.push(`console: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('response', (res) => {
    if (res.status() >= 500) problems.push(`${res.status()} ${res.url()}`)
  })
  return () => expect(problems, problems.join('\n')).toEqual([])
}

export async function axe(page: Page) {
  // @axe-core/playwright ships its own playwright-core typings; the runtime API is the same.
  const r = await new AxeBuilder({ page: page as unknown as ConstructorParameters<typeof AxeBuilder>[0]['page'] })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // MapLibre's own canvas and controls are third-party; our overlays are still scanned.
    .exclude('.maplibregl-canvas-container')
    .exclude('.maplibregl-ctrl-attrib')
    .analyze()
  const summary = r.violations.map((v) => `${v.id}: ${v.nodes.length} × ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`)
  expect(summary, summary.join('\n')).toEqual([])
}

export async function logCatch(page: Page, fields: { species: string; length?: string; lure?: string; privacy?: 'Exact spot' | 'Water only' | 'Hidden' }) {
  await page.goto('/log')
  await expect(page.getByText(/39\.75306° N/)).toBeVisible()
  await page.getByLabel('Species').fill(fields.species)
  if (fields.length) await page.getByLabel(/^Length/).fill(fields.length)
  if (fields.lure) await page.getByLabel('Fly, lure or bait').fill(fields.lure)
  // Tap the visible segment, as a person would; the radio inside it is visually hidden.
  if (fields.privacy) await page.getByRole('radiogroup').locator('label', { hasText: fields.privacy }).click()
  await page.getByRole('button', { name: 'Save catch' }).click()
  await expect(page.getByRole('heading', { level: 1, name: fields.species })).toBeVisible()
}
