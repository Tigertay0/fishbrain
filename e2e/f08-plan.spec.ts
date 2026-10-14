import { test, expect } from '@playwright/test'
import { GOLDEN, mockNetwork, PLACES } from './mocks'
import { axe, guard } from './helpers'

test.describe('F08 what to use at this water', () => {
  test('F08-H1 a river: species from public records, a rig with a diagram, bait, lures and why', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto(`/plan?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}&type=river&name=Clear%20Creek`)
    await expect(page.getByRole('heading', { level: 2, name: 'Clear Creek' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Best bets here' })).toBeVisible()
    // The most-recorded fish leads, with its evidence.
    const first = page.getByRole('region', { name: 'Best bets' }).locator('details').first()
    await expect(first).toContainText('Brown trout')
    await expect(first).toContainText('14 public records nearby')
    await expect(first.getByRole('img', { name: /Diagram of a/ })).toBeVisible()
    await expect(first.getByText('Bait', { exact: true })).toBeVisible()
    await expect(first.getByText('Lures', { exact: true })).toBeVisible()
    await expect(first.getByRole('listitem').filter({ hasText: /spinner/ }).first()).toBeVisible()
    expect(await first.getByRole('listitem').count()).toBeGreaterThan(10) // a real choice, not one lure
    await expect(first).toContainText('Why:')
    // One combined list to pack, across the best bets.
    const pack = page.getByRole('region', { name: 'Bring these' })
    await expect(pack).toBeVisible()
    expect(await pack.getByRole('listitem').count()).toBeGreaterThan(10)
    // Not a target species, but recorded: listed separately.
    await expect(page.getByText(/Also recorded: White Sucker/)).toBeVisible()
    // A gauge reading when the map has already loaded nearby gauges, otherwise an estimate.
    await expect(page.getByTestId('conditions-summary')).toContainText(/\((estimate|gauge)\)/)
    await axe(page)
    await first.getByRole('link', { name: 'How to tie it' }).click()
    await expect(page.getByRole('heading', { name: 'How to set it up' })).toBeVisible()
    check()
  })

  test('F08-H2 your thermometer reading and method change the advice', async ({ page }) => {
    await mockNetwork(page)
    await page.goto(`/plan?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}&type=river&name=Clear%20Creek`)
    await page.locator('summary', { hasText: 'Adjust' }).click()
    await page.getByLabel(/from a thermometer/).fill('74')
    await expect(page.getByTestId('conditions-summary')).toContainText('74°F water (your reading)')
    // 74°F is too warm for trout: the warning shows and largemouth bass move up.
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText('Largemouth bass')
    await expect(page.getByText(/68°F or warmer/).first()).toBeAttached()
    await page.getByRole('radiogroup').filter({ hasText: 'Lures' }).locator('label', { hasText: 'Fly' }).click()
    const first = page.getByRole('region', { name: 'Best bets' }).locator('details').first()
    await expect(first.getByText('Flies', { exact: true })).toBeVisible()
    await expect(first.getByText('Bait', { exact: true })).toHaveCount(0)
    await expect(first.getByText('Lures', { exact: true })).toHaveCount(0)
  })

  test('F08-H3 a lake found from coordinates alone', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto(`/plan?lat=${PLACES.lake.lat}&lon=${PLACES.lake.lon}`)
    await expect(page.getByRole('heading', { level: 2, name: 'Test Lake' })).toBeVisible()
    await expect(page.getByTestId('conditions-summary')).toContainText('Lake')
    expect(counts.overpass).toBe(1)
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText(/Largemouth bass|Brown trout|Rainbow trout/)
  })

  test('F08-E1 no public records: falls back to typical fish, and says so', async ({ page }) => {
    await mockNetwork(page)
    await page.goto(`/plan?lat=${PLACES.empty.lat}&lon=${PLACES.empty.lon}&type=pond&name=Quiet%20Pond`)
    await expect(page.getByText(/No public fish records near here yet/)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText(/Bluegill|Largemouth|Catfish|Crappie/)
  })

  test('F08-E2 salt water: the tide now, coastal fish with saltwater rigs, and tide timing per fish', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto(`/plan?lat=${PLACES.coast.lat}&lon=${PLACES.coast.lon}`)
    await expect(page.getByTestId('conditions-summary')).toContainText(/Coast · \d+°F water \(sea surface\)/)
    const tides = page.getByRole('region', { name: 'Tides' })
    await expect(tides).toContainText(/Rising|Falling|Slack/)
    await expect(tides).toContainText(/Dauphin Island/)
    await expect(tides.getByRole('listitem').first()).toContainText(/High|Low/)
    const first = page.getByRole('region', { name: 'Best bets' }).locator('details').first()
    await expect(first).toContainText(/Redfish|Speckled trout|Flounder|Sheepshead|Black drum|Spanish mackerel/)
    await expect(first).toContainText(/Tide:.*Best on/)
    await expect(first).not.toContainText(/Largemouth|Bluegill/)
    await expect(page.getByText(/own licence/)).toBeVisible()
    await axe(page)
    check()
  })

  test('F08-H4 France: official electrofishing surveys count as evidence', async ({ page }) => {
    const counts = await mockNetwork(page)
    await page.goto(`/plan?lat=${PLACES.france.lat}&lon=${PLACES.france.lon}&type=river&name=Is%C3%A8re`)
    await expect(page.getByText(/Official surveys/)).toBeVisible()
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText('Brown trout')
    await expect(page.getByText(/Baitfish recorded here/)).toHaveCount(0)
    expect(counts.hubeau).toBe(1)
  })

  test('F08-H5 Montana: stocking reports show and count as evidence', async ({ page }) => {
    await mockNetwork(page)
    await page.goto(`/plan?lat=${PLACES.montana.lat}&lon=${PLACES.montana.lon}`)
    await expect(page.getByRole('heading', { level: 2, name: 'Missoula Kids Pond' })).toBeVisible()
    await expect(page.getByText(/Stocked recently \(Montana FWP fish plants\)/)).toBeVisible()
    await expect(page.getByText(/264 Rainbow Trout/)).toBeVisible()
  })

  test('F08-H6 from a public fish sighting on the map to a plan for that fish', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto(`/?focus=${PLACES.sighting.lat},${PLACES.sighting.lon},14`)
    await page.waitForTimeout(2500)
    await page.getByTestId('map').click()
    const sheet = page.getByRole('region', { name: /Rainbow Trout/ })
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('test_observer')
    await expect(sheet).toContainText('CC BY-NC')
    await sheet.getByRole('button', { name: 'What to use here' }).click()
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText('Rainbow trout')
    check()
  })

  test('F08-H8 opening the tab finds you and answers, with nothing to fill in', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'What to use' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Clear Creek' })).toBeVisible()
    await expect(page.getByTestId('conditions-summary')).toContainText(/River · \d+°F water \((estimate|gauge)\) · Clear/)
    await expect(page.getByRole('region', { name: 'Best bets' }).locator('details').first()).toContainText('Brown trout')
    // The controls exist but stay out of the way.
    await expect(page.getByLabel(/from a thermometer/)).toBeHidden()
    check()
  })

  test('F08-H7 the rig guide', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/rigs')
    await page.getByRole('button', { name: 'Fly' }).click()
    await expect(page.getByRole('link', { name: /Texas rig/ })).toHaveCount(0)
    await page.getByRole('link', { name: /Dry-dropper/ }).click()
    await expect(page.getByRole('img', { name: /Diagram of a Dry-dropper/ })).toBeVisible()
    await axe(page)
  })
})

test.describe('F08 without location permission', () => {
  test.use({ permissions: [] })
  test('F08-E3 location refused: says so and offers the map', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/plan')
    await expect(page.getByText(/Location is turned off for this site/)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Pick water on the map' })).toBeVisible()
  })
})
