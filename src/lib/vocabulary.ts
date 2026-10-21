import vocabularyData from './data/vocabulary.json';

export type VocabularyEntry = {
	id: string;
	theme: string;
	word: string;
	definition: string;
};

export type VocabularyDirection = 'word-to-definition' | 'definition-to-word';
export type AnswerMode = 'self-assessment' | 'multiple-choice';

export type AnswerOption = {
	value: string;
	correct: boolean;
};

export const VOCABULARY: readonly VocabularyEntry[] = vocabularyData;
export const THEMES = [...new Set(VOCABULARY.map((entry) => entry.theme))];

export function vocabularyForTheme(theme: string): VocabularyEntry[] {
	return VOCABULARY.filter((entry) => entry.theme === theme);
}

export function getCardContent(
	entry: VocabularyEntry,
	direction: VocabularyDirection
): { prompt: string; answer: string } {
	return direction === 'word-to-definition'
		? { prompt: entry.word, answer: entry.definition }
		: { prompt: entry.definition, answer: entry.word };
}

function normalizeAnswer(value: string): string {
	return value.normalize('NFKC').trim().toLocaleLowerCase('fr');
}

export function createAnswerOptions(
	entries: readonly VocabularyEntry[],
	entry: VocabularyEntry,
	direction: VocabularyDirection,
	random: () => number = Math.random
): AnswerOption[] {
	const correctAnswer = getCardContent(entry, direction).answer;
	const correctKey = normalizeAnswer(correctAnswer);
	const distractors = new Map<string, string>();

	for (const candidate of entries) {
		if (candidate.id === entry.id) continue;

		const answer = getCardContent(candidate, direction).answer;
		const key = normalizeAnswer(answer);
		if (key !== correctKey && !distractors.has(key)) distractors.set(key, answer);
	}

	const availableDistractors = [...distractors.values()];
	if (availableDistractors.length < 3) {
		throw new Error('Ce thème ne contient pas assez de réponses distinctes pour un QCM.');
	}

	const selectedDistractors: string[] = [];
	for (let index = 0; index < 3; index += 1) {
		const randomIndex = Math.min(
			Math.floor(random() * availableDistractors.length),
			availableDistractors.length - 1
		);
		selectedDistractors.push(availableDistractors.splice(randomIndex, 1)[0]);
	}

	const options: AnswerOption[] = [
		{ value: correctAnswer, correct: true },
		...selectedDistractors.map((value) => ({ value, correct: false }))
	];

	for (let index = options.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.min(Math.floor(random() * (index + 1)), index);
		[options[index], options[randomIndex]] = [options[randomIndex], options[index]];
	}

	return options;
}
