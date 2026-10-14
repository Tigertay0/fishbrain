// Opt-in: SCREENS=1 npx playwright test e2e/screens.spec.ts --project=mobile
// Saves the clone's screens at 390×844 into replica/clone-screens/ for replica-diff.
import { test, expect } from '@playwright/test'
import { GOLDEN, mockNetwork, PLACES } from './mocks'
import { logCatch } from './helpers'

test.skip(!process.env.SCREENS, 'set SCREENS=1 to capture')
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const shot = (name: string) => `replica/clone-screens/${name}.png`

test('capture screens', async ({ page }) => {
  await mockNetwork(page)
  // Map first: catch pins logged at the same spot would sit on top of the gauge.
  await page.goto(`/?focus=${GOLDEN.lat},${GOLDEN.lon},12`)
  await page.waitForTimeout(2500)
  await page.getByTestId('map').click()
  await expect(page.getByRole('img', { name: /Flow over 7 days/ })).toBeVisible()
  await page.screenshot({ path: shot('S04-gauge') })
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('button', { name: 'Map layers and offline' }).click()
  await page.screenshot({ path: shot('S02-layers') })

  await logCatch(page, { species: 'Brown trout', length: '17.5', lure: 'Sculpin streamer' })
  await page.screenshot({ path: shot('S08-catch-detail'), fullPage: true })
  await logCatch(page, { species: 'Rainbow trout', length: '13', lure: 'Zebra Midge' })
  await logCatch(page, { species: 'Brown trout', length: '12', lure: 'Pheasant Tail nymph', privacy: 'Hidden' })

  await page.goto('/log')
  await expect(page.getByText(/39\.75306° N/)).toBeVisible()
  await page.getByLabel('Species').fill('Cutthroat trout')
  await page.screenshot({ path: shot('S06-log-catch'), fullPage: true })

  await page.goto('/logbook')
  await page.screenshot({ path: shot('S07-logbook'), fullPage: true })
  await page.goto('/stats')
  await page.screenshot({ path: shot('S09-stats'), fullPage: true })

  await page.goto(`/forecast?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}&name=Clear%20Creek`)
  await page.getByRole('button', { name: /^7 AM, score/ }).click()
  await page.screenshot({ path: shot('S05-forecast'), fullPage: true })

  await page.goto(`/plan?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}&type=river&name=Clear%20Creek`)
  await expect(page.getByRole('heading', { name: 'Best bets here' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S14-plan'), fullPage: true })
  await page.goto(`/plan?lat=${PLACES.lake.lat}&lon=${PLACES.lake.lon}`)
  await page.getByLabel(/Have a thermometer/).fill('72')
  await page.waitForTimeout(500)
  await page.screenshot({ path: shot('S14-plan-lake'), fullPage: true })
  await page.goto('/rigs/carolina')
  await page.screenshot({ path: shot('S15-rig'), fullPage: true })
  await page.goto('/species')
  await page.screenshot({ path: shot('S11-species') })
  await page.goto('/settings')
  await page.screenshot({ path: shot('S12-settings'), fullPage: true })
})
