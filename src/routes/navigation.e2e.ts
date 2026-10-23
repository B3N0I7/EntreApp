import { expect, test, type Page } from '@playwright/test';

async function startGuestSession(page: Page) {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Continuer comme invité' }).click();
	await expect(page.getByRole('heading', { name: 'À qui le tour?' })).toBeVisible();
}

test('desktop navigation opens each section', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await startGuestSession(page);

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(navigation.getByRole('link', { name: 'Tirage au sort' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await navigation.getByRole('link', { name: 'Trouve la définition' }).click();
	await expect(page.getByRole('heading', { name: 'Trouve la définition' })).toBeVisible();
	await page.getByLabel('Thème').selectOption('Le tourisme et les voyages');
	await expect(page.getByText('Carte 1 / 5')).toBeVisible();
	await expect(page.getByText('5 cartes dans la série · 116 disponibles')).toBeVisible();
	await navigation.getByRole('link', { name: 'Donne la définition' }).click();
	await expect(page.getByRole('heading', { name: 'Retrouve le mot' })).toBeVisible();
	await navigation.getByRole('link', { name: 'Expressions françaises' }).click();
	await expect(page.getByRole('heading', { name: 'Expressions françaises' })).toBeVisible();
	await expect(page.getByText('5 cartes dans la série · 101 disponibles')).toBeVisible();
	await page.getByLabel('Sens des cartes').selectOption('definition-to-word');
	await expect(
		page.getByRole('article').getByText('Définition → expression', { exact: true })
	).toBeVisible();
	await navigation.getByRole('link', { name: 'Conjugaison' }).click();
	await expect(page.getByRole('heading', { name: 'Conjugaison' })).toBeVisible();
	await page.getByRole('combobox', { name: 'Verbe' }).selectOption('être');
	await page.getByRole('combobox', { name: 'Temps' }).selectOption('Plus-que-parfait');
	await page.getByRole('button', { name: 'Commencer' }).click();
	await expect(page.getByRole('heading', { name: 'être' })).toBeVisible();
	await expect(page.getByRole('region').getByText('Plus-que-parfait')).toBeVisible();
	await navigation.getByRole('link', { name: 'Tirage au sort' }).click();
	await expect(page.getByRole('heading', { name: 'À qui le tour?' })).toBeVisible();
});

test('mobile navigation opens, closes with Escape, and closes after navigation', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await startGuestSession(page);

	const menuButton = page.getByRole('button', { name: /Ouvrir le menu|Fermer le menu/ });
	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(navigation).toBeHidden();
	await menuButton.click();
	await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
	await expect(navigation).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(page.getByRole('button', { name: 'Ouvrir le menu' })).toBeFocused();
	await expect(navigation).toBeHidden();

	await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
	await navigation.getByRole('link', { name: 'Conjugaison' }).click();
	await expect(page.getByRole('heading', { name: 'Conjugaison' })).toBeVisible();
	await expect(navigation).toBeHidden();
});

test('guest can try exercises without exposing history or persisting a run', async ({ page }) => {
	await page.goto('/conjugaison');
	await expect(page).toHaveURL(/\/login$/);
	await page.goto('/login');
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Nom' }).locator('option')).toHaveCount(14);

	await page.getByRole('button', { name: 'Continuer comme invité' }).click();
	await expect(page.getByRole('heading', { name: 'À qui le tour?' })).toBeVisible();
	await expect(page.getByText('Invité', { exact: true })).toBeVisible();
	await expect(
		page
			.getByRole('navigation', { name: 'Navigation principale' })
			.getByRole('link', { name: 'Historique' })
	).toHaveCount(0);

	const result = await page.evaluate(async () => {
		const response = await fetch('/api/history', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ module: 'conjugaison', score: '0/1', erreurs: [] })
		});
		return { status: response.status, body: await response.json() };
	});
	expect(result).toEqual({ status: 200, body: { saved: false } });
});
