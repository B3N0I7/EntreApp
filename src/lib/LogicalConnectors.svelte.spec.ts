import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LogicalConnectors from './LogicalConnectors.svelte';

describe('logical connectors page', () => {
	it('renders categories, usage notes, and examples without levels', async () => {
		render(LogicalConnectors);

		await expect
			.element(page.getByRole('heading', { name: 'Connecteurs logiques', level: 1 }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('7 catégories · 84 connecteurs', { exact: true }))
			.toBeInTheDocument();
		for (const category of [
			'La Cause',
			'La Conséquence',
			'L’Opposition et la Concession',
			'L’Addition et la Succession d’idées',
			'Le But (L’objectif visé)',
			'La Condition et l’Hypothèse',
			'L’Illustration et l’Exemple'
		]) {
			await expect
				.element(page.getByRole('heading', { name: category, level: 2 }))
				.toBeInTheDocument();
		}
		await expect
			.element(page.getByRole('heading', { name: 'Par exemple', level: 3 }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Réponse directe à la question « pourquoi ? »'))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('Je ne viens pas demain parce que je suis malade.', { exact: true }))
			.toBeInTheDocument();
		await expect.element(page.getByText('Niveau A1', { exact: true })).not.toBeInTheDocument();
	});

	it('filters categories and restores the complete list', async () => {
		render(LogicalConnectors);

		const categoryFilter = page.getByRole('combobox', { name: 'Filtrer par catégorie' });
		await categoryFilter.selectOptions('cause');
		await expect
			.element(page.getByRole('heading', { name: 'La Cause', level: 2 }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'La Conséquence', level: 2 }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByText('1 catégorie · 12 connecteurs', { exact: true }))
			.toBeInTheDocument();

		await categoryFilter.selectOptions('all');
		await expect
			.element(page.getByRole('heading', { name: 'La Conséquence', level: 2 }))
			.toBeInTheDocument();
		await expect
			.element(page.getByText('7 catégories · 84 connecteurs', { exact: true }))
			.toBeInTheDocument();
	});
});
