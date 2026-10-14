import { test, expect } from '@playwright/test'
import { mockNetwork } from './mocks'
import { guard } from './helpers'

test('every tab renders with no console errors', async ({ page }, info) => {
  const check = guard(page)
  await mockNetwork(page)
  await page.goto('/')
  await expect(page.getByRole('search')).toBeVisible()
  await page.screenshot({ path: info.outputPath('map.png') })
  for (const [tab, heading] of [
    ['Forecast', 'Forecast'],
    ['Logbook', 'Logbook'],
    ['More', 'More'],
  ] as const) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click()
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await page.screenshot({ path: info.outputPath(`${tab.toLowerCase()}.png`), fullPage: true })
  }
  check()
})
