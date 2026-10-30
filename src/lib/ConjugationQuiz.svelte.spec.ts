import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConjugationQuiz from './ConjugationQuiz.svelte';

afterEach(() => {
	vi.restoreAllMocks();
	window.localStorage.clear();
});

describe('ConjugationQuiz', () => {
	it('checks all eight pronouns and reports the completed score', async () => {
		render(ConjugationQuiz);
		await page.getByRole('combobox', { name: 'Verbe' }).selectOptions('etre');
		await page.getByRole('combobox', { name: 'Temps' }).selectOptions('present');
		await page.getByRole('button', { name: 'Commencer' }).click();

		const answers = [
			'je suis',
			'tu es',
			'il est',
			'elle est',
			'nous sommes',
			'vous êtes',
			'ils sont',
			'elles sont'
		];

		for (let index = 0; index < answers.length; index += 1) {
			const input = page.getByRole('textbox');
			await input.fill(answers[index]);
			await page.getByRole('button', { name: 'Vérifier' }).click();
			await expect.element(page.getByRole('status')).toHaveTextContent('Correct');
			await page
				.getByRole('button', {
					name: index === answers.length - 1 ? 'Voir le résultat' : 'Pronom suivant'
				})
				.click();
		}

		await expect.element(page.getByRole('heading', { name: 'Série terminée' })).toBeInTheDocument();
		await expect.element(page.getByRole('status')).toHaveTextContent('8 / 8 réponses correctes');
	});

	it('limits the impersonal verb falloir to il', async () => {
		render(ConjugationQuiz);
		await page.getByRole('combobox', { name: 'Verbe' }).selectOptions('falloir');
		await page.getByRole('combobox', { name: 'Temps' }).selectOptions('passeCompose');
		await page.getByRole('button', { name: 'Commencer' }).click();

		await expect.element(page.getByText('1 / 1')).toBeInTheDocument();
		await expect
			.element(page.getByText('Verbe impersonnel · seule la forme « il » est utilisée.'))
			.toBeInTheDocument();
		await page.getByRole('textbox').fill('il a fallu');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect.element(page.getByRole('status')).toHaveTextContent('Correct');
		await page.getByRole('button', { name: 'Voir le résultat' }).click();
		await expect.element(page.getByRole('status')).toHaveTextContent('1 / 1 réponses correctes');
	});

	it('uses the generated futur proche', async () => {
		render(ConjugationQuiz);
		await page.getByRole('combobox', { name: 'Verbe' }).selectOptions('aller');
		await page.getByRole('combobox', { name: 'Temps' }).selectOptions('futurProche');
		await page.getByRole('button', { name: 'Commencer' }).click();

		await page.getByRole('textbox').fill('je vais aller');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await expect.element(page.getByRole('status')).toHaveTextContent('Correct');
	});

	it('restores and saves the selected verb and tense', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
			if (input === '/api/preferences?activity=conjugation') {
				return new Response(JSON.stringify({ verbChoice: 'etre', tenseChoice: 'present' }), {
					headers: { 'content-type': 'application/json' }
				});
			}
			return new Response(JSON.stringify({ saved: true }), {
				headers: { 'content-type': 'application/json' }
			});
		});
		render(ConjugationQuiz);

		await expect.element(page.getByRole('combobox', { name: 'Verbe' })).toHaveValue('etre');
		await expect.element(page.getByRole('combobox', { name: 'Temps' })).toHaveValue('present');
		await page.getByRole('combobox', { name: 'Verbe' }).selectOptions('falloir');
		await page.getByRole('combobox', { name: 'Temps' }).selectOptions('passeCompose');

		const preferenceSaves = () =>
			fetchSpy.mock.calls.filter(
				([input, options]) => input === '/api/preferences' && options?.method === 'PUT'
			);
		await expect.poll(preferenceSaves).toHaveLength(2);
		expect(preferenceSaves().map(([, options]) => JSON.parse(String(options?.body)))).toEqual([
			{ activity: 'conjugation', settings: { verbChoice: 'falloir', tenseChoice: 'present' } },
			{ activity: 'conjugation', settings: { verbChoice: 'falloir', tenseChoice: 'passeCompose' } }
		]);
	});

	it('persists one completed run with the failed conjugation', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ saved: true }), {
				headers: { 'content-type': 'application/json' }
			})
		);
		render(ConjugationQuiz);
		await page.getByRole('combobox', { name: 'Verbe' }).selectOptions('falloir');
		await page.getByRole('combobox', { name: 'Temps' }).selectOptions('passeCompose');
		await page.getByRole('button', { name: 'Commencer' }).click();
		await page.getByRole('textbox').fill('il est fallu');
		await page.getByRole('button', { name: 'Vérifier' }).click();
		await page.getByRole('button', { name: 'Voir le résultat' }).click();

		const historyCalls = () =>
			fetchSpy.mock.calls.filter(
				([input, options]) => input === '/api/history' && options?.method === 'POST'
			);
		await expect.poll(historyCalls).toHaveLength(1);
		const historyCall = historyCalls()[0];
		const payload = JSON.parse(String(historyCall?.[1]?.body)) as {
			module: string;
			score: string;
			erreurs: Array<{ verbeId: string; tempsId: string; pronom: string; reponseEleve: string }>;
			tentatives: Array<{ itemId: string; isCorrect: boolean }>;
		};
		expect(historyCall?.[0]).toBe('/api/history');
		expect(payload).toMatchObject({ module: 'conjugaison', score: '0/1' });
		expect(payload.erreurs).toEqual([
			expect.objectContaining({
				verbeId: 'falloir',
				tempsId: 'passeCompose',
				pronom: 'il',
				reponseEleve: 'il est fallu'
			})
		]);
		expect(payload.tentatives).toEqual([
			expect.objectContaining({ itemId: 'falloir:passeCompose:il', isCorrect: false })
		]);
	});
});
