import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/design-system')
  await expect(page.getByRole('heading', { name: 'Bold boundaries. Clear authority. No ambiguity.' })).toBeVisible()
})

test('exposes labelled component contracts and readable status contrast', async ({ page }) => {
  await expect(page.getByLabel('Work email', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('group', { name: 'Choose the employee role' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Representative employee access approvals' })).toBeVisible()

  const unnamedControls = await page.locator('button, input, select, textarea, a[href]').evaluateAll((elements) => (
    elements.filter((element) => {
      const htmlElement = element as HTMLElement
      if (htmlElement.getAttribute('aria-hidden') === 'true') return false
      const labelledBy = htmlElement.getAttribute('aria-labelledby')
      const ariaLabel = htmlElement.getAttribute('aria-label')
      const text = htmlElement.textContent?.trim()
      const id = htmlElement.id
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null
      return !labelledBy && !ariaLabel && !text && !explicitLabel
    }).map((element) => element.outerHTML)
  ))
  expect(unnamedControls).toEqual([])

  const contrastRatios = await page.locator('[data-a11y-contrast] > *').evaluateAll((elements) => {
    function rgb(value: string): [number, number, number] {
      const match = value.match(/[\d.]+/g)
      if (!match || match.length < 3) throw new Error(`Unsupported color: ${value}`)
      return [Number(match[0]), Number(match[1]), Number(match[2])]
    }

    function luminance([red, green, blue]: [number, number, number]): number {
      const channels = [red, green, blue].map((channel) => {
        const normalized = channel / 255
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    }

    return elements.map((element) => {
      const style = getComputedStyle(element)
      const foreground = luminance(rgb(style.color))
      const background = luminance(rgb(style.backgroundColor))
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
    })
  })
  for (const ratio of contrastRatios) expect(ratio).toBeGreaterThanOrEqual(4.5)
})

test('supports keyboard role selection', async ({ page }) => {
  const developer = page.getByRole('radio', { name: /Developer/ })
  const reviewer = page.getByRole('radio', { name: /Reviewer \/ Tech Lead/ })

  await expect(developer).toBeChecked()
  await developer.focus()
  await page.keyboard.press('ArrowDown')
  await expect(reviewer).toBeChecked()
  await expect(reviewer).toBeFocused()
})

test('traps dialog focus, closes with Escape, and restores focus', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Review approval' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Review protected change' })
  await expect(dialog).toBeVisible()
  const backgroundIsInert = await page.getByTestId('design-system-review').evaluate((element) => (
    Boolean(element.closest('[inert]'))
  ))
  expect(backgroundIsInert).toBe(true)
  await expect(page.getByRole('button', { name: 'Close Review protected change' })).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Approve change' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Close Review protected change' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('matches the approved desktop representative baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.getByTestId('design-system-review')).toHaveScreenshot('design-system-desktop.png', {
    animations: 'disabled',
  })
  await expect(page.locator('#roles')).toHaveScreenshot('role-selection-desktop.png', {
    animations: 'disabled',
  })
})

test('reflows without page-level horizontal overflow at mobile width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('group', { name: 'Choose the employee role' })).toBeVisible()

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)

  await expect(page.getByTestId('design-system-review')).toHaveScreenshot('design-system-mobile.png', {
    animations: 'disabled',
  })
  await page.locator('#roles').scrollIntoViewIfNeeded()
  await page.getByTestId('design-system-review').evaluate((element) => {
    element.scrollBy({ top: -400 })
  })
  await expect(page).toHaveScreenshot('role-selection-mobile.png', {
    animations: 'disabled',
  })
})
