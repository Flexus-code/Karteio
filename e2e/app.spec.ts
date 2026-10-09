import { expect, test, type Page } from '@playwright/test'

/** Startbildschirm und Kurzanleitung überspringen */
async function skipIntro(page: Page) {
  const splash = page.getByRole('presentation')
  if (await splash.isVisible().catch(() => false)) await splash.click()
  await page.getByRole('button', { name: 'Überspringen' }).click()
  await expect(page.getByRole('dialog', { name: 'Kurzanleitung' })).toBeHidden()
  // Im Safari-Tab (nicht installiert) erscheint die Installationsanleitung
  await page.getByRole('button', { name: 'Verstanden' }).click()
}

/** Beispiel-Stapel laden und warten, bis er angelegt ist */
async function loadSample(page: Page) {
  await page.getByRole('button', { name: 'Beispiel-Stapel laden' }).click()
  await expect(page.getByRole('heading', { name: 'Beispiel: IHK-Prüfung' })).toBeVisible()
}

async function typeInEditor(page: Page, index: number, text: string) {
  const editor = page.locator('.ProseMirror').nth(index)
  await editor.click()
  await page.keyboard.type(text)
}

test('Ordner, Stapel und Karte anlegen', async ({ page }) => {
  await page.goto('#/ordner')
  await skipIntro(page)

  await page.getByRole('button', { name: 'Ordner erstellen' }).click()
  await page.getByPlaceholder('z. B. Wirtschafts- und Sozialkunde').fill('Netzwerke')
  await page.getByRole('dialog').getByRole('button', { name: 'Ordner erstellen' }).click()
  await page.getByRole('button', { name: 'Ordner Netzwerke öffnen' }).click()

  await page.getByRole('button', { name: 'Stapel erstellen' }).click()
  await page.getByPlaceholder('z. B. OSI-Modell').fill('OSI-Modell')
  await page.getByRole('dialog').getByRole('button', { name: 'Stapel erstellen' }).click()
  await page.getByRole('button', { name: 'Stapel OSI-Modell öffnen' }).click()

  await page.getByRole('button', { name: 'Karte hinzufügen' }).click()
  await typeInEditor(page, 0, 'Was macht ein Router?')
  await typeInEditor(page, 1, 'Er verbindet Netzwerke.')
  await page.getByRole('button', { name: 'Fertig', exact: true }).click()

  await expect(page.locator('.card-row')).toHaveCount(1)
  await expect(page.locator('.card-row')).toContainText('Was macht ein Router?')
  await expect(page.locator('.card-row')).toContainText('Er verbindet Netzwerke.')
})

test('Beispiel-Stapel laden und eine Lerneinheit abschließen', async ({ page }) => {
  await page.goto('#/ordner')
  await skipIntro(page)
  await loadSample(page)

  await page.goto('#/lernen')
  await page.getByRole('button', { name: /Jetzt lernen/ }).click()
  await expect(page).toHaveURL(/sitzung/)

  const done = page.getByText('Lerneinheit abgeschlossen')
  const show = page.getByRole('button', { name: 'Antwort zeigen', exact: true })
  const input = page.getByLabel('Deine Antwort')
  const choose = page.getByText('Wähle deine Antwort')
  for (let i = 0; i < 40; i++) {
    // Warten, bis die nächste Karte (oder die Zusammenfassung) da ist
    await expect(done.or(show).or(input).or(choose).first()).toBeVisible()
    if (await done.isVisible()) break
    if (await show.isVisible()) await show.click()
    else if (await input.isVisible()) {
      await input.fill('443')
      await input.press('Enter')
    } else if (await choose.isVisible()) {
      await page.locator('button.border-2').first().click()
      const check = page.getByRole('button', { name: 'Prüfen' })
      if (await check.isVisible()) await check.click()
    }
    const easy = page.getByRole('button', { name: /^Einfach/ })
    await easy.waitFor({ state: 'visible', timeout: 5000 })
    await easy.click()
    await page.waitForTimeout(150)
  }

  await expect(page.getByText('Lerneinheit abgeschlossen')).toBeVisible()
  await page.getByRole('button', { name: 'Fertig' }).click()
  await expect(page.getByText('Super, alles wiederholt!')).toBeVisible()
})

test('Suche findet Karten', async ({ page }) => {
  await page.goto('#/ordner')
  await skipIntro(page)
  await loadSample(page)
  await page.goto('#/suche')
  await page.getByLabel('Suchbegriff').fill('Probezeit')
  await expect(page.getByRole('heading', { name: '1 Karte' })).toBeVisible()
  await expect(page.locator('mark').first()).toHaveText('Probezeit')
})

test('Backup wird als Datei erstellt', async ({ page }) => {
  // Teilen-Menü abschalten, damit der Download-Weg genutzt wird
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: undefined })
  })
  await page.goto('#/ordner')
  await skipIntro(page)
  await loadSample(page)
  await page.goto('#/einstellungen')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /Backup erstellen/ }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^karteio-backup-\d{4}-\d{2}-\d{2}\.json$/)
  await expect(page.getByText(/Backup erstellt: 9 Karten/)).toBeVisible()
})
