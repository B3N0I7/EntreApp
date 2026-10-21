import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { PEOPLE } from '../lib/draw';
import Home from './+page.svelte';

describe('home draw page', () => {
	it('updates the available count and starts a new cycle after all participants', async () => {
		render(Home);

		const drawButton = page.getByRole('button', { name: 'Tirer un nom' });
		const result = page.getByRole('status');

		await drawButton.click();
		await expect.element(page.getByText('13 personnes disponibles')).toBeInTheDocument();
		await expect
			.element(result)
			.toHaveTextContent(
				/^(Abdulnaser|Ali|Fatima|Farzana|Gulnaz|Husna|Manar|Maoud|Olga|Pema|Sepideh|Tsogyal|Vitalii|Prof)$/
			);

		for (let index = 1; index < PEOPLE.length; index += 1) {
			await drawButton.click();
		}

		await expect.element(page.getByText('Cycle terminé · liste renouvelée')).toBeInTheDocument();
		await expect.element(page.getByText('14 / 14')).toBeInTheDocument();

		await drawButton.click();
		await expect.element(page.getByText('13 personnes disponibles')).toBeInTheDocument();
	});
});
