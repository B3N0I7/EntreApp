import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConjugationQuiz from './ConjugationQuiz.svelte';

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
});
