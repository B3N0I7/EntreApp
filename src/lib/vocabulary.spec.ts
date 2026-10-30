import { describe, expect, it } from 'vitest';
import expressionData from './data/expression.json';
import vocabularyData from './data/vocabulary.json';
import {
	canUseMultipleChoice,
	createAnswerOptions,
	createVocabularySession,
	getCardContent,
	maxVocabularySessionSize,
	RANDOM_SECTION,
	RANDOM_THEME,
	sectionsForTheme,
	themesForVocabulary,
	uniqueVocabularyForDirection,
	vocabularyForSection,
	vocabularyForTheme
} from './vocabulary';

const familyTheme = 'Les relations familiales et l’amour';
const travelTheme = 'Le tourisme et les voyages';
const environmentTheme = 'Les enjeux environnementaux';
const expressionsTheme = 'Expressions françaises';

describe('vocabulary data', () => {
	it('keeps vocabulary and expression data in separate catalogs', () => {
		expect(themesForVocabulary(vocabularyData)).toEqual([
			familyTheme,
			travelTheme,
			environmentTheme
		]);
		expect(vocabularyForTheme(vocabularyData, familyTheme)).toHaveLength(58);
		expect(vocabularyForTheme(vocabularyData, travelTheme)).toHaveLength(116);
		expect(vocabularyForTheme(vocabularyData, environmentTheme)).toHaveLength(11);
		expect(themesForVocabulary(vocabularyData)).not.toContain(expressionsTheme);
		expect(themesForVocabulary(expressionData)).toEqual([expressionsTheme]);
		expect(vocabularyForTheme(expressionData, expressionsTheme)).toHaveLength(101);
		expect(
			[...vocabularyData, ...expressionData].every(
				(entry) => entry.id && entry.section && entry.word && entry.definition
			)
		).toBe(true);

		const stepParent = vocabularyForTheme(vocabularyData, familyTheme).find(
			(entry) => entry.word === 'le beau-père'
		);
		expect(stepParent?.definition).toContain('soit le père de son mari');
		expect(stepParent?.definition).toContain('soit le nouveau mari de sa mère');
		expect(vocabularyForTheme(expressionData, expressionsTheme)[0]).toMatchObject({
			word: 'Avoir le cafard',
			definition: 'être triste, mélancolique ou déprimé.'
		});
	});

	it('preserves source sections and the sports subsection', () => {
		expect(sectionsForTheme(vocabularyData, travelTheme)).toContain('Les activités');
		expect(vocabularyForSection(vocabularyData, travelTheme, 'Les saisons / partir')).toHaveLength(
			4
		);
		expect(
			vocabularyData.filter((entry) => entry.subsection === 'Détails des sports')
		).toHaveLength(8);
	});

	it('samples unique prompts from a manual section in either direction', () => {
		const section = 'Les saisons / partir';
		const sourceEntries = vocabularyForSection(vocabularyData, travelTheme, section);

		for (const direction of ['word-to-definition', 'definition-to-word'] as const) {
			const session = createVocabularySession(
				vocabularyData,
				travelTheme,
				section,
				direction,
				4,
				() => 0
			);
			const prompts = session.entries.map((entry) => getCardContent(entry, direction).prompt);

			expect(session.entries).toHaveLength(4);
			expect(new Set(prompts).size).toBe(4);
			expect(session.pool).toEqual(uniqueVocabularyForDirection(sourceEntries, direction));
			expect(canUseMultipleChoice(session.pool, direction)).toBe(true);
			expect(maxVocabularySessionSize(vocabularyData, travelTheme, section, direction)).toBe(4);
			expect(() =>
				createVocabularySession(vocabularyData, travelTheme, section, direction, 5)
			).toThrow('Cette sélection contient au maximum 4 cartes distinctes.');
		}
	});

	it('chooses a theme and section uniformly from eligible random scopes', () => {
		const session = createVocabularySession(
			vocabularyData,
			RANDOM_THEME,
			RANDOM_SECTION,
			'word-to-definition',
			5,
			() => 0
		);

		expect(session.theme).toBe(familyTheme);
		expect(session.section).toBe('Les moments de la vie');
		expect(session.pool).toHaveLength(7);
		expect(session.entries).toHaveLength(5);
	});

	it('creates four unique options with exactly one correct answer in either direction', () => {
		const familyEntries = vocabularyForTheme(vocabularyData, familyTheme);
		const familyCard = familyEntries.find((entry) => entry.word === 'le beau-père')!;
		const travelEntries = vocabularyForTheme(vocabularyData, travelTheme);
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
		const [entry] = vocabularyForTheme(vocabularyData, familyTheme);
		expect(() => createAnswerOptions([entry], entry, 'word-to-definition')).toThrow(
			'Ce thème ne contient pas assez de réponses distinctes pour un QCM.'
		);
	});
});
