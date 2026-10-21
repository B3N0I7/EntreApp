import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { RANDOM_SECTION, RANDOM_THEME } from './vocabulary';
import VocabularyFlashcards from './VocabularyFlashcards.svelte';

describe('VocabularyFlashcards', () => {
	beforeEach(() => {
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('reveals a definition and records a self-assessment', async () => {
		render(VocabularyFlashcards, { direction: 'word-to-definition' });

		await expect
			.element(page.getByRole('heading', { name: 'Trouve la définition' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'l’adolescence (f.)' }))
			.toBeInTheDocument();

		await page.getByRole('button', { name: 'Révéler la réponse' }).click();
		await expect
			.element(
				page.getByText('période de la vie entre l’enfance et l’âge adulte (environ 12–18 ans).')
			)
			.toBeInTheDocument();

		await page.getByRole('button', { name: 'Acquis' }).click();
		await expect.element(page.getByText('Carte 2 / 5')).toBeInTheDocument();
	});

	it('offers a QCM from a definition to its word', async () => {
		render(VocabularyFlashcards, { direction: 'definition-to-word' });

		await expect
			.element(page.getByRole('heading', { name: 'Retrouve le mot' }))
			.toBeInTheDocument();
		await expect
			.element(
				page.getByRole('heading', {
					name: 'période de la vie entre l’enfance et l’âge adulte (environ 12–18 ans).'
				})
			)
			.toBeInTheDocument();
		await page.getByRole('button', { name: 'QCM' }).click();

		const answers = page.getByRole('group', { name: 'Réponses proposées' });
		await answers.getByRole('button', { name: 'l’adolescence (f.)' }).click();
		await expect.element(page.getByRole('status')).toHaveTextContent('Bonne réponse');

		await page.getByRole('button', { name: 'Carte suivante' }).click();
		await expect.element(page.getByText('Carte 2 / 5')).toBeInTheDocument();
	});

	it('filters a section and validates a custom session length', async () => {
		render(VocabularyFlashcards, { direction: 'word-to-definition' });

		await page.getByRole('combobox', { name: 'Thème' }).selectOptions('Le tourisme et les voyages');
		await page.getByRole('combobox', { name: 'Section' }).selectOptions('Les saisons / partir');
		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('Cette sélection contient au maximum 4 cartes distinctes.');

		await page.getByRole('combobox', { name: 'Cartes par série' }).selectOptions('custom');
		await page.getByRole('spinbutton', { name: 'Nombre de cartes personnalisé' }).fill('4');
		await expect.element(page.getByText('Carte 1 / 4')).toBeInTheDocument();
		await expect
			.element(page.getByText('Le tourisme et les voyages · Les saisons / partir'))
			.toBeInTheDocument();
	});

	it('selects a random theme and then a random section', async () => {
		render(VocabularyFlashcards, { direction: 'word-to-definition' });

		await page.getByRole('combobox', { name: 'Thème' }).selectOptions(RANDOM_THEME);
		await page.getByRole('combobox', { name: 'Section' }).selectOptions(RANDOM_SECTION);

		await expect
			.element(page.getByText('Les relations familiales et l’amour · Les moments de la vie'))
			.toBeInTheDocument();
		await expect.element(page.getByText('Carte 1 / 5')).toBeInTheDocument();
	});
});
