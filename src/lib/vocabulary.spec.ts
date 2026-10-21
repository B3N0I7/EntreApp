import { describe, expect, it } from 'vitest';
import {
	createAnswerOptions,
	getCardContent,
	THEMES,
	VOCABULARY,
	vocabularyForTheme
} from './vocabulary';

const familyTheme = 'Les relations familiales et l’amour';
const travelTheme = 'Le tourisme et les voyages';

describe('vocabulary data', () => {
	it('contains both complete themes and keeps compound family definitions together', () => {
		expect(THEMES).toEqual([familyTheme, travelTheme]);
		expect(vocabularyForTheme(familyTheme)).toHaveLength(58);
		expect(vocabularyForTheme(travelTheme)).toHaveLength(116);
		expect(VOCABULARY.every((entry) => entry.id && entry.word && entry.definition)).toBe(true);

		const stepParent = vocabularyForTheme(familyTheme).find(
			(entry) => entry.word === 'le beau-père'
		);
		expect(stepParent?.definition).toContain('soit le père de son mari');
		expect(stepParent?.definition).toContain('soit le nouveau mari de sa mère');
	});

	it('creates four unique options with exactly one correct answer in either direction', () => {
		const familyEntries = vocabularyForTheme(familyTheme);
		const familyCard = familyEntries.find((entry) => entry.word === 'le beau-père')!;
		const travelEntries = vocabularyForTheme(travelTheme);
		const travelCard = travelEntries[0];

		for (const [entries, entry, direction] of [
			[familyEntries, familyCard, 'word-to-definition'],
			[travelEntries, travelCard, 'definition-to-word']
		] as const) {
			const options = createAnswerOptions(entries, entry, direction, () => 0);
			const correctAnswer = getCardContent(entry, direction).answer;

			expect(options).toHaveLength(4);
			expect(new Set(options.map((option) => option.value)).size).toBe(4);
			expect(options.filter((option) => option.correct)).toEqual([
				{ value: correctAnswer, correct: true }
			]);
		}
	});

	it('rejects a QCM theme without three distinct distractors', () => {
		const [entry] = vocabularyForTheme(familyTheme);
		expect(() => createAnswerOptions([entry], entry, 'word-to-definition')).toThrow(
			'Ce thème ne contient pas assez de réponses distinctes pour un QCM.'
		);
	});
});
