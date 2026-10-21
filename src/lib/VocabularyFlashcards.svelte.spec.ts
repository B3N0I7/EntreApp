import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VocabularyFlashcards from './VocabularyFlashcards.svelte';

describe('VocabularyFlashcards', () => {
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
		await expect.element(page.getByText('Carte 2 / 58')).toBeInTheDocument();
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
		await expect.element(page.getByText('Carte 2 / 58')).toBeInTheDocument();
	});
});
