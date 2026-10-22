import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import {
	ALL_SECTIONS,
	createAnswerOptions,
	createVocabularySession,
	RANDOM_SECTION,
	RANDOM_THEME,
	THEMES
} from './vocabulary';
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

	it('persists a completed self-assessment with review cards as errors', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ saved: true }), {
				headers: { 'content-type': 'application/json' }
			})
		);
		render(VocabularyFlashcards, { direction: 'word-to-definition' });

		for (let index = 0; index < 5; index += 1) {
			await page.getByRole('button', { name: 'Révéler la réponse' }).click();
			await page.getByRole('button', { name: index === 0 ? 'À revoir' : 'Acquis' }).click();
		}

		await expect.poll(() => fetchSpy).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as {
			module: string;
			score: string;
			erreurs: Array<{ entryId: string; mode: string; reponseEleve: string; correction: string }>;
		};
		expect(fetchSpy.mock.calls[0]?.[0]).toBe('/api/history');
		expect(payload).toMatchObject({ module: 'vocabulaire-mot', score: '4/5' });
		expect(payload.erreurs).toHaveLength(1);
		expect(payload.erreurs[0]?.entryId).toBeTruthy();
		expect(payload.erreurs[0]).toMatchObject({
			mode: 'self-assessment',
			reponseEleve: ''
		});
	});

	it('persists wrong QCM choices with the correction', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ saved: true }), {
				headers: { 'content-type': 'application/json' }
			})
		);
		render(VocabularyFlashcards, { direction: 'word-to-definition' });
		await page.getByRole('button', { name: 'QCM' }).click();

		const answers = page.getByRole('group', { name: 'Réponses proposées' });
		const session = createVocabularySession(
			THEMES[0] ?? '',
			ALL_SECTIONS,
			'word-to-definition',
			5,
			() => 0
		);
		const firstOptions = createAnswerOptions(
			session.pool,
			session.entries[0]!,
			'word-to-definition',
			() => 0
		);
		const correctAnswer = firstOptions.find((option) => option.correct)?.value;
		const wrongChoice = firstOptions.find((option) => !option.correct)?.value;
		expect(wrongChoice).toBeTruthy();

		for (let index = 0; index < 5; index += 1) {
			const choices = page.getByRole('group', { name: 'Réponses proposées' }).getByRole('button');
			if (index === 0) {
				await answers.getByRole('button', { name: wrongChoice!, exact: true }).click();
			} else await choices.first().click();
			await page.getByRole('button', { name: 'Carte suivante' }).click();
		}

		await expect.poll(() => fetchSpy).toHaveBeenCalledTimes(1);
		const payload = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as {
			module: string;
			erreurs: Array<{ mode: string; reponseEleve: string; correction: string }>;
		};
		expect(payload.module).toBe('vocabulaire-mot');
		expect(payload.erreurs).toContainEqual(
			expect.objectContaining({
				mode: 'multiple-choice',
				reponseEleve: wrongChoice,
				correction: correctAnswer
			})
		);
	});
});
