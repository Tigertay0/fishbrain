// Renders public/icons/icon.svg to the PNG sizes the manifest and iOS need.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('public/icons/icon.svg', 'utf8')
const jobs = [
  { file: 'icon-192.png', size: 192, pad: 0 },
  { file: 'icon-512.png', size: 512, pad: 0 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0, square: true },
  // Maskable icons need the art inside the central 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, pad: 0.1, square: true },
]
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
const page = await browser.newPage()
for (const j of jobs) {
  const inner = Math.round(j.size * (1 - j.pad * 2))
  const art = j.square ? svg.replace('rx="112"', 'rx="0"') : svg
  await page.setViewportSize({ width: j.size, height: j.size })
  await page.setContent(
    `<html><body style="margin:0;background:${j.square ? '#a6461a' : 'transparent'};display:grid;place-items:center;width:${j.size}px;height:${j.size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${art.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`,
  )
  await page.screenshot({ path: `public/icons/${j.file}`, omitBackground: !j.square })
  console.log('wrote', j.file)
}
await browser.close()
