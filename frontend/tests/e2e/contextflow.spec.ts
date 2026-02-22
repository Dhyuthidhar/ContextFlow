import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'
const PROJECT_ID = '2e8d2de5-4363-4810-ab8c-ce053a14101f'

// ── TEST 1: Projects list loads ──
test('projects list page loads with data', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects`)
  await expect(page.locator('h1')).toContainText('Projects')
  const cards = page.locator('[data-testid="project-card"]').or(
    page.locator('text=ContextFlow')
  )
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
  console.log('PASS - Projects list loads')
})

// ── TEST 2: Project detail loads ──
test('project detail page shows correct data', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects/${PROJECT_ID}`)
  await expect(page.locator('h1')).toContainText('ContextFlow', { timeout: 10000 })
  await expect(page.locator('text=Documents Uploaded')).toBeVisible()
  await expect(page.locator('text=Principles Extracted')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Analyze Project' })).toBeVisible()
  console.log('PASS - Project detail loads')
})

// ── TEST 3: Documents list shows files ──
test('project documents list is populated', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects/${PROJECT_ID}`)
  await page.waitForLoadState('networkidle')
  const docs = page.locator('text=architecture')
  await expect(docs.first()).toBeVisible({ timeout: 10000 })
  console.log('PASS - Documents list populated')
})

// ── TEST 4: New project creation ──
test('can create a new project', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects/new`)
  await expect(page.locator('h1')).toContainText('New Project', { timeout: 5000 })
  await page.fill('input[name="name"]', `E2E Test ${Date.now()}`)
  await page.selectOption('select[name="project_type"]', 'api')
  await page.fill('textarea[name="description"]', 'Created by Playwright test')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/projects\/[a-f0-9-]{36}$/, { timeout: 15000 })
  expect(page.url()).toMatch(/\/projects\/[a-f0-9-]{36}$/)
  console.log('PASS - New project created')
})

// ── TEST 5: Query tool works ──
test('query project returns results', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects/${PROJECT_ID}`)
  await page.waitForLoadState('networkidle')

  const queryInput = page.locator('input[placeholder*="API errors"]').or(
    page.locator('input[placeholder*="query"]')
  )
  await queryInput.fill('how should I handle API errors?')
  await page.click('button:has-text("Ask")')

  await expect(
    page.locator('text=From Your Docs').or(page.locator('p:has-text("Principles")').last())
  ).toBeVisible({ timeout: 30000 })
  console.log('PASS - Query returns results')
})

// ── TEST 6: Principles page loads ──
test('principles browser loads with data', async ({ page }) => {
  await page.goto(`${BASE_URL}/principles`)
  await expect(page.locator('h1')).toContainText('Principles', { timeout: 10000 })
  const items = page.locator('[class*="principle"]').or(
    page.locator('text=confidence')
  )
  await expect(items.first()).toBeVisible({ timeout: 10000 })
  console.log('PASS - Principles browser loads')
})

// ── TEST 7: Upload page renders ──
test('upload page renders correctly', async ({ page }) => {
  await page.goto(`${BASE_URL}/projects/${PROJECT_ID}/upload`)
  await expect(page.getByRole('heading', { name: 'Upload Document' })).toBeVisible({ timeout: 10000 })
  console.log('PASS - Upload page renders')
})
