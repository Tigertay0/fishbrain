import { test, expect } from '@playwright/test'
import { GOLDEN, mockNetwork, readStore } from './mocks'
import { axe, guard } from './helpers'

test.describe('F01 check a stream before going', () => {
  test('F01-H1 open a gauge from the map: flow, trout temp, 7-day chart', async ({ page }) => {
    const check = guard(page)
    const counts = await mockNetwork(page)
    await page.goto(`/?focus=${GOLDEN.lat},${GOLDEN.lon},12`)
    await expect.poll(() => counts.usgs).toBeGreaterThan(0)
    // The gauge sits exactly at the map centre once the fly-to settles.
    await page.waitForTimeout(1500)
    await page.getByTestId('map').click()
    const sheet = page.getByRole('region', { name: /Clear Creek at Golden, CO/ })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('71.8 cfs', { exact: true })).toBeVisible()
    await expect(sheet.getByText('55°F', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Prime', { exact: true })).toBeVisible()
    await expect(sheet.getByRole('img', { name: /Flow over 7 days/ })).toBeVisible()
    await axe(page)
    // From the gauge straight into logging, with the water name prefilled.
    await sheet.getByRole('button', { name: 'Log a catch here' }).click()
    await expect(page.getByLabel('Water', { exact: true })).toHaveValue('Clear Creek')
    check()
  })

  test('F01-E1 gauges stay cached: a second visit makes no new USGS request', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto(`/?focus=${GOLDEN.lat},${GOLDEN.lon},12`)
    // Wait until the response is in IndexedDB, not just requested.
    await expect.poll(async () => (await readStore(page, 'apiCache')).some((r) => String(r.key).startsWith('usgs:cell:')), { timeout: 15_000 }).toBe(true)
    const first = counts.usgs
    await page.reload()
    await page.waitForTimeout(2500)
    expect(counts.usgs).toBe(first)
    const cache = await readStore(page, 'apiCache')
    expect(cache.some((r) => String(r.key).startsWith('usgs:cell:'))).toBe(true)
  })

  test('F01-E2 basemap down: the app still opens and says so', async ({ page }) => {
    const check = guard(page, [/Failed to load resource/, /ERR_INTERNET_DISCONNECTED/])
    await mockNetwork(page, { styleFails: true })
    await page.goto('/')
    await expect(page.getByText('Basemap unavailable. Showing your data only.')).toBeVisible()
    check()
  })

  test('F01-E3 zoomed out: asks to zoom in instead of spending the USGS quota', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto('/')
    await expect(page.getByText('Zoom in to see river gauges')).toBeVisible()
    expect(counts.usgs).toBe(0)
  })
})

test.describe('F04 markers and search', () => {
  test('F04-H1 add a marker at the map centre', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto(`/?focus=${GOLDEN.lat},${GOLDEN.lon},13`)
    await page.getByRole('button', { name: 'Add a marker at the map center' }).click()
    const sheet = page.getByRole('region', { name: 'New marker' })
    await sheet.getByRole('button', { name: 'Save marker' }).click()
    await expect(sheet.getByText('Give it a name you will recognise later.')).toBeVisible()
    await sheet.getByRole('radiogroup').locator('label', { hasText: 'Parking' }).click()
    await sheet.getByLabel('Name').fill('Pull-off below the bridge')
    await sheet.getByRole('button', { name: 'Save marker' }).click()
    await expect(page.getByText('Marker saved')).toBeVisible()
    const markers = await readStore(page, 'markers')
    expect(markers).toHaveLength(1)
    expect(markers[0]).toMatchObject({ kind: 'parking', name: 'Pull-off below the bridge' })
    check()
  })

  test('F04-H2 search a place and jump to it', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto('/')
    await page.getByLabel('Search for a place or river').fill('Clear Creek Golden')
    await page.getByRole('button', { name: 'Go' }).click()
    await page.getByRole('button', { name: /Clear Creek/ }).click()
    expect(counts.nominatim).toBe(1)
    await expect.poll(() => counts.usgs).toBeGreaterThan(0) // landed close enough to load gauges
  })

  test('F04-H3 layers: OSM places load near you by default, and the toggle hides them', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto(`/?focus=${GOLDEN.lat},${GOLDEN.lon},13`)
    await expect.poll(() => counts.overpass, { timeout: 15_000 }).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Map layers and offline' }).click()
    await page.getByLabel(/Shops, ramps and access/).uncheck()
    await expect(page.getByLabel(/Shops, ramps and access/)).not.toBeChecked()
    // Public land is on by default, with a colour key that goes away with the layer.
    await expect(page.getByRole('checkbox', { name: /Public land/ })).toBeChecked()
    await expect(page.getByRole('list', { name: 'Public land colours' })).toContainText('Federal')
    await page.getByRole('checkbox', { name: /Public land/ }).uncheck()
    await expect(page.getByRole('list', { name: 'Public land colours' })).toHaveCount(0)
    await page.getByRole('checkbox', { name: /Public land/ }).check()
    await expect(page.getByText(/basemap isn't loaded/)).toBeVisible() // the test style has no vector tiles to save
    await axe(page)
  })
})
