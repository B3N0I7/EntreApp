import { expect, test, type Page } from '@playwright/test';
import { ACCOUNTS } from '../lib/accounts';
import {
	createSessionToken,
	SESSION_COOKIE,
	SESSION_DURATION_SECONDS
} from '../lib/server/session';

async function startGuestSession(page: Page) {
	await page.goto('/login');
	await page.getByRole('button', { name: 'Continuer comme invité' }).click();
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
}

async function startAccountSession(page: Page, accountId: 'ali' | 'prof') {
	const account = ACCOUNTS.find(({ id }) => id === accountId);
	if (!account) throw new Error(`Unknown test account: ${accountId}`);
	const secret = process.env.SESSION_SECRET;
	if (!secret) throw new Error('The Playwright session secret is not configured.');

	await page.goto('/login');
	const token = createSessionToken(
		{
			userId: account.id,
			name: account.name,
			role: account.role,
			expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
		},
		secret
	);
	await page
		.context()
		.addCookies([{ name: SESSION_COOKIE, value: token, url: new URL(page.url()).origin }]);
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
}

async function expectCompactFilter(page: Page, id: string) {
	const select = page.locator(`#${id}`);
	await expect(select).toBeVisible();
	const height = await select.evaluate((element) =>
		Number.parseFloat(getComputedStyle(element).height)
	);
	const bounds = await select.boundingBox();
	const labelGap = await select.evaluate((element) => {
		const labelText = element.closest('label')?.querySelector('span');
		return labelText
			? element.getBoundingClientRect().top - labelText.getBoundingClientRect().bottom
			: null;
	});

	expect(height).toBe(44);
	expect(bounds).not.toBeNull();
	expect(bounds!.x).toBeGreaterThanOrEqual(0);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
	expect(labelGap).not.toBeNull();
	expect(labelGap).toBeLessThanOrEqual(5);
}

test('desktop navigation opens each section', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await startGuestSession(page);

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(navigation.getByRole('link', { name: 'Tirage au sort' })).toHaveCount(0);
	await expect(navigation.getByRole('link', { name: 'Vocabulaire' })).toHaveCount(1);
	await expect(navigation.getByRole('link', { name: 'Trouve la définition' })).toHaveCount(0);
	await expect(navigation.getByRole('link', { name: 'Donne la définition' })).toHaveCount(0);
	await page.goto('/tirage');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
	await navigation.getByRole('link', { name: 'Vocabulaire' }).click();
	await expect(page.getByRole('heading', { name: 'Trouve la définition' })).toBeVisible();
	await expect(navigation.getByRole('link', { name: 'Vocabulaire' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await page.getByLabel('Thème').selectOption('Le tourisme et les voyages');
	await expect(page.getByText('Carte 1 / 5')).toBeVisible();
	await expect(page.getByText('5 cartes dans la série · 116 disponibles')).toBeVisible();
	await page.getByLabel('Sens des cartes').selectOption('definition-to-word');
	await expect(page.getByRole('heading', { name: 'Retrouve le mot' })).toBeVisible();
	await page.goto('/vocabulaire?direction=definition-to-word');
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
	await page.getByRole('link', { name: 'Accueil' }).click();
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
});

test('student sees the overview but cannot open the draw route', async ({ page }) => {
	await startAccountSession(page, 'ali');

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(navigation.getByRole('link', { name: 'Tirage au sort' })).toHaveCount(0);
	await expect(navigation.getByRole('link', { name: 'Vocabulaire' })).toBeVisible();
	await page.goto('/tirage');
	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
});

test('admin opens the draw from the menu', async ({ page }) => {
	await startAccountSession(page, 'prof');

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await navigation.getByRole('link', { name: 'Tirage au sort' }).click();
	await expect(page).toHaveURL(/\/tirage$/);
	await expect(page.getByRole('heading', { name: 'À qui le tour?' })).toBeVisible();
	await expect(navigation.getByRole('link', { name: 'Tirage au sort' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await expect(navigation.getByRole('link', { name: 'Administration' })).toBeVisible();
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

test('mobile vocabulary controls stay compact', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await startGuestSession(page);

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
	await navigation.getByRole('link', { name: 'Vocabulaire' }).click();
	await expect(page.getByRole('heading', { name: 'Trouve la définition' })).toBeVisible();
	for (const id of ['vocabulary-theme', 'vocabulary-section', 'vocabulary-length']) {
		await expectCompactFilter(page, id);
	}

	await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
	await navigation.getByRole('link', { name: 'Expressions françaises' }).click();
	await expect(page.getByRole('heading', { name: 'Expressions françaises' })).toBeVisible();
	await expect(page.locator('#vocabulary-theme')).toHaveCount(0);
	await expect(page.locator('#vocabulary-section')).toHaveCount(0);
	await expectCompactFilter(page, 'vocabulary-length');
});

test('guest can try exercises without exposing history or persisting a run', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
	await expect(page.getByRole('combobox', { name: 'Nom' }).locator('option')).toHaveCount(14);
	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	for (const label of ['Tirage au sort', 'Vocabulaire', 'Expressions françaises', 'Conjugaison']) {
		await expect(navigation.getByRole('link', { name: label })).toHaveCount(0);
	}
	await expect(navigation.getByRole('link', { name: 'Connexion' })).toBeVisible();

	for (const path of ['/', '/vocabulaire', '/expressions', '/conjugaison', '/tirage']) {
		await page.goto(path);
		await expect(page).toHaveURL(/\/login$/);
	}

	await page.getByRole('button', { name: 'Continuer comme invité' }).click();
	await expect(page.getByRole('heading', { name: 'Objectif B1' })).toBeVisible();
	await expect(navigation.getByText('Invité', { exact: true })).toBeVisible();
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
