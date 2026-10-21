import { describe, expect, it } from 'vitest';
import {
	chooseConjugationPair,
	getAcceptedAnswers,
	getPronouns,
	getVerb,
	isCorrectConjugation,
	PERSONS,
	TENSES,
	VERBS
} from './conjugation';

describe('conjugation data', () => {
	it('contains 30 verbs with the six requested tenses and every applicable person', () => {
		expect(VERBS).toHaveLength(30);
		expect(TENSES.map((tense) => tense.label)).toEqual([
			'Présent',
			'Passé composé',
			'Imparfait',
			'Plus-que-parfait',
			'Futur proche',
			'Futur simple'
		]);

		for (const verb of VERBS) {
			for (const tense of TENSES) {
				const pronouns = getPronouns(verb, tense.id);
				expect(pronouns.length).toBe(verb.impersonal ? 1 : PERSONS.length);
				for (const pronoun of pronouns) {
					expect(getAcceptedAnswers(verb, tense.id, pronoun).length).toBeGreaterThan(0);
				}
			}
		}
	});

	it('keeps source notes and handles gender, alternatives, falloir, and futur proche', () => {
		const aller = getVerb('aller')!;
		const passer = getVerb('passer')!;
		const falloir = getVerb('falloir')!;
		const etre = getVerb('etre')!;

		expect(etre.notes.length).toBeGreaterThan(0);
		expect(getAcceptedAnswers(aller, 'passeCompose', 'il')).toEqual(['il est allé']);
		expect(getAcceptedAnswers(aller, 'passeCompose', 'elle')).toEqual(['elle est allée']);
		expect(getAcceptedAnswers(passer, 'passeCompose', 'je')).toContain("j'ai passé");
		expect(getAcceptedAnswers(passer, 'passeCompose', 'je')).toContain('je suis passée');
		expect(getPronouns(falloir, 'present')).toEqual(['il']);
		expect(getAcceptedAnswers(falloir, 'futurProche', 'il')).toEqual(['il va falloir']);
		expect(getAcceptedAnswers(etre, 'futurProche', 'je')).toEqual(['je vais être']);
	});
});

describe('conjugation answers and selection', () => {
	it('normalizes case, spaces, and apostrophe style but keeps accents significant', () => {
		expect(isCorrectConjugation('  J’AIME  ', ["j'aime"])).toBe(true);
		expect(isCorrectConjugation('nous mangeons', ['nous mangeons'])).toBe(true);
		expect(isCorrectConjugation('nous mangons', ['nous mangeons'])).toBe(false);
	});

	it('chooses verb and tense independently and avoids a used pair until the pool resets', () => {
		const first = chooseConjugationPair(null, null, new Set(), () => 0);
		expect(first).toEqual({ verbId: 'etre', tenseId: 'present' });

		const second = chooseConjugationPair(
			null,
			null,
			new Set([`${first.verbId}:${first.tenseId}`]),
			() => 0
		);
		expect(second).toEqual({ verbId: 'etre', tenseId: 'passeCompose' });

		const fixedVerb = chooseConjugationPair('aller', null, new Set(), () => 0);
		const fixedTense = chooseConjugationPair(null, 'futurSimple', new Set(), () => 0);
		expect(fixedVerb.verbId).toBe('aller');
		expect(fixedTense.tenseId).toBe('futurSimple');
	});
});
