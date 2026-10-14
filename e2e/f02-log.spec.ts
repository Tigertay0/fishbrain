import { test, expect } from '@playwright/test'
import { GOLDEN, mockNetwork, readStore, type MockOptions } from './mocks'
import { axe, guard, logCatch } from './helpers'

test.describe('F02 log a catch at the water', () => {
  test('F02-H1 log with GPS: conditions attach automatically', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await logCatch(page, { species: 'Brown trout', length: '16', lure: 'Pheasant Tail nymph' })
    await expect(page.getByText('16 in')).toBeVisible()
    await expect(page.getByText(/inHg/)).toBeVisible() // pressure from the weather lookup
    await expect(page.getByText('Clear Creek at Golden, CO')).toBeVisible() // nearest gauge
    await axe(page)
    await page.getByRole('link', { name: 'Logbook' }).click()
    await expect(page.getByRole('link', { name: /Brown trout/ })).toBeVisible()
    check()
  })

  test('F02-E1 "Hidden" stores no coordinates at all', async ({ page }) => {
    await mockNetwork(page)
    await logCatch(page, { species: 'Rainbow trout', privacy: 'Hidden' })
    await expect(page.getByText('No location was stored for this catch.')).toBeVisible()
    const [c] = await readStore(page, 'catches')
    expect(c.lat).toBeUndefined()
    expect(c.lon).toBeUndefined()
    expect(c.privacy).toBe('hidden')
  })

  test('F02-E2 "Water only" rounds the point to about 1 km', async ({ page }) => {
    await mockNetwork(page)
    await logCatch(page, { species: 'Brook trout', privacy: 'Water only' })
    const [c] = await readStore(page, 'catches')
    expect(c.lat).not.toBe(GOLDEN.lat)
    expect(Math.abs(Number(c.lat) - GOLDEN.lat)).toBeLessThan(0.01)
  })

  test('F02-N1 species is required; nothing is saved', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/log')
    await page.getByLabel(/^Length/).fill('abc')
    await page.getByRole('button', { name: 'Save catch' }).click()
    await expect(page.getByText('What did you catch?')).toBeVisible()
    await expect(page.getByText('Enter a number, like 14.5')).toBeVisible()
    await expect(page.getByLabel('Species')).toBeFocused()
    expect(await readStore(page, 'catches')).toHaveLength(0)
  })

  test('F02-E3 double tap on save creates one catch', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/log')
    await expect(page.getByText(/39\.75306° N/)).toBeVisible()
    await page.getByLabel('Species').fill('Cutthroat trout')
    await page.getByRole('button', { name: 'Save catch' }).dblclick()
    await expect(page.getByRole('heading', { level: 1, name: 'Cutthroat trout' })).toBeVisible()
    expect(await readStore(page, 'catches')).toHaveLength(1)
  })

  test('F02-E4 no signal: saves anyway, fills conditions when back online', async ({ page }) => {
    const check = guard(page, [/Failed to load resource/])
    const opts: MockOptions = {}
    await mockNetwork(page, opts)
    await page.goto('/log')
    await expect(page.getByText(/39\.75306° N/)).toBeVisible()
    opts.meteoDown = true
    await page.getByLabel('Species').fill('Brown trout')
    await page.getByRole('button', { name: 'Save catch' }).click()
    await expect(page.getByText(/Saved offline/)).toBeVisible()
    opts.meteoDown = false
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(page.getByText(/Added conditions to 1 catch saved offline/)).toBeVisible()
    await expect(page.getByText(/Saved offline/)).toBeHidden()
    await expect(page.getByText(/inHg/)).toBeVisible()
    check()
  })

  test('F02-H2 photo, edit and delete', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto('/log')
    await page.getByLabel(/Add photo/).setInputFiles('public/icons/icon-512.png')
    await expect(page.getByRole('img', { name: 'Catch photo' })).toBeVisible()
    await page.getByLabel('Species').fill('Brown trout')
    await page.getByRole('button', { name: 'Save catch' }).click()
    await expect(page.getByRole('img', { name: 'Brown trout catch' })).toBeVisible()
    expect(await readStore(page, 'photos')).toHaveLength(1)

    await page.getByRole('link', { name: 'Edit' }).click()
    await expect(page.getByLabel('Species')).toHaveValue('Brown trout')
    await page.getByLabel(/^Length/).fill('18.5')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('18.5 in')).toBeVisible()
    expect(await readStore(page, 'catches')).toHaveLength(1)

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: 'Delete catch' }).click()
    await expect(page.getByText('No catches yet')).toBeVisible()
    expect(await readStore(page, 'photos')).toHaveLength(0) // the photo goes with it
    check()
  })

  test('F05 logbook filter and stats', async ({ page }) => {
    test.setTimeout(60_000) // logs four catches
    await mockNetwork(page)
    await logCatch(page, { species: 'Brown trout', length: '14' })
    await logCatch(page, { species: 'Brown trout', length: '20' })
    await logCatch(page, { species: 'Rainbow trout', length: '12' })
    await page.goto('/logbook')
    await page.getByRole('button', { name: 'Rainbow trout 1' }).click()
    await expect(page.getByRole('link', { name: /Brown trout/ })).toHaveCount(0)
    await page.goto('/stats')
    await expect(page.getByText('20 in')).toBeVisible() // longest
    await axe(page)
  })
})
