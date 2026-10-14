import { test, expect } from '@playwright/test'
import { GOLDEN, mockNetwork } from './mocks'
import { axe, guard } from './helpers'

test.describe('F03 plan a trip by forecast', () => {
  test('F03-H1 seven days, a rating, and the reasons behind each hour', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await page.goto(`/forecast?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}&name=Clear%20Creek`)
    await expect(page.getByText('Clear Creek', { exact: true })).toBeVisible()
    await expect(page.getByText(/times in America\/Denver/)).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(7)
    await expect(page.getByRole('tab', { name: /Today/ })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText(/^Best:/)).toBeVisible()
    await page.getByRole('button', { name: /^6 AM, score/ }).click()
    await expect(page.getByText('Baseline')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Sun and moon' })).toContainText('Sunrise')
    await page.getByRole('tab').nth(3).click()
    await expect(page.getByRole('tab').nth(3)).toHaveAttribute('aria-selected', 'true')
    await axe(page)
    check()
  })

  test('F03-E1 no place yet: finds your location on open, then forecasts it', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/forecast')
    await expect(page.getByText('Your location')).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(7)
  })

  test('F03-E2 weather down: still scores sun and moon, and says so', async ({ page }) => {
    await mockNetwork(page, { meteoDown: true })
    await page.goto(`/forecast?lat=${GOLDEN.lat}&lon=${GOLDEN.lon}`)
    await expect(page.getByText(/Scores below use sun and moon only/)).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(7)
  })
})
