import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { mockNetwork, readStore } from './mocks'
import { axe, guard, logCatch } from './helpers'

test.describe('F07 move my data', () => {
  test('F07-H1 back up, wipe, restore', async ({ page }) => {
    const check = guard(page)
    await mockNetwork(page)
    await logCatch(page, { species: 'Brown trout', length: '15' })
    await page.goto('/settings')
    await expect(page.getByText(/1 catches, 0 markers/)).toBeVisible()
    await axe(page)

    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Back up (JSON)' }).click()])
    const path = await dl.path()
    const backup = JSON.parse(readFileSync(path!, 'utf8'))
    expect(backup.format).toBe('tailout-export')
    expect(backup.catches).toHaveLength(1)

    page.once('dialog', (d) => void d.accept())
    await page.getByRole('button', { name: 'Delete all my data' }).click()
    await expect(page.getByText(/0 catches, 0 markers/)).toBeVisible()

    await page.getByLabel('Backup file to restore').setInputFiles(path!)
    await expect(page.getByText(/Imported 1 catches/)).toBeVisible()
    expect(await readStore(page, 'catches')).toHaveLength(1)
    check()
  })

  test('F07-N1 a file that is not a backup is refused', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/settings')
    await page.getByLabel('Backup file to restore').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
    await expect(page.getByText('That file is not a Tailout export.')).toBeVisible()
  })

  test('F07-H2 CSV export with formulas neutralised', async ({ page }) => {
    await mockNetwork(page)
    await page.goto('/log')
    await page.getByLabel('Species').fill('=HYPERLINK("http://x")')
    await page.getByRole('button', { name: 'Save catch' }).click()
    await page.goto('/settings')
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Catches as CSV' }).click()])
    const csv = readFileSync((await dl.path())!, 'utf8')
    expect(csv.split('\n')[0]).toMatch(/^caught_at,species,length_cm/)
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`)
  })
})

test('screens pass an accessibility scan', async ({ page }) => {
  await mockNetwork(page)
  for (const path of ['/', '/log', '/logbook', '/species', '/more', '/stats']) {
    await page.goto(path)
    await page.waitForTimeout(300)
    await axe(page)
  }
})
