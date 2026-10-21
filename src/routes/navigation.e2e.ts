import { expect, test } from '@playwright/test';

test('desktop navigation opens each section', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 900 });
	await page.goto('/');

	const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
	await expect(navigation.getByRole('link', { name: 'Tirage au sort' })).toHaveAttribute(
		'aria-current',
		'page'
	);
	await navigation.getByRole('link', { name: 'Trouve la définition' }).click();
	await expect(page.getByRole('heading', { name: 'Trouve la définition' })).toBeVisible();
	await page.getByLabel('Thème').selectOption('Le tourisme et les voyages');
	await expect(page.getByText('Carte 1 / 116')).toBeVisible();
	await navigation.getByRole('link', { name: 'Donne la définition' }).click();
	await expect(page.getByRole('heading', { name: 'Retrouve le mot' })).toBeVisible();
	await navigation.getByRole('link', { name: 'Tirage au sort' }).click();
	await expect(page.getByRole('heading', { name: 'À qui le tour?' })).toBeVisible();
});

test('mobile navigation opens, closes with Escape, and closes after navigation', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

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
	await navigation.getByRole('link', { name: 'Trouve la définition' }).click();
	await expect(page.getByRole('heading', { name: 'Trouve la définition' })).toBeVisible();
	await expect(navigation).toBeHidden();
});
