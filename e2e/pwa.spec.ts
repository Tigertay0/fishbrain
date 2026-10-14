import { test, expect } from '@playwright/test'
import { logCatch } from './helpers'
import { mockNetwork } from './mocks'

// This one needs the real service worker.
test.use({ serviceWorkers: 'allow' })

test('PWA: after one visit, the app and the logbook open with no network', async ({ page, context }) => {
  // context.route also sees requests the service worker makes.
  await context.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (r) => r.fulfill({ status: 204, body: '' }))
  await mockNetwork(page)
  await page.goto('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  await logCatch(page, { species: 'Brook trout', length: '9' })

  await context.setOffline(true)
  await page.goto('/logbook')
  await expect(page.getByRole('heading', { level: 1, name: 'Logbook' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Brook trout/ })).toBeVisible()
  await page.goto('/log')
  await page.getByLabel('Species').fill('Rainbow trout')
  await page.getByRole('button', { name: 'Save catch' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Rainbow trout' })).toBeVisible()
  await context.setOffline(false)

  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json())
  expect(manifest).toMatchObject({ name: 'Tailout', display: 'standalone', start_url: '/' })
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true)
})
