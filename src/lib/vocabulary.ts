import vocabularyData from './data/vocabulary.json';

export type VocabularyEntry = {
	id: string;
	theme: string;
	section: string;
	subsection?: string;
	word: string;
	definition: string;
};

export type VocabularyDirection = 'word-to-definition' | 'definition-to-word';
export type AnswerMode = 'self-assessment' | 'multiple-choice';
export type VocabularyScope = {
	theme: string;
	section: string | null;
	entries: VocabularyEntry[];
	pool: VocabularyEntry[];
};

export const RANDOM_THEME = '__random_theme__';
export const ALL_SECTIONS = '__all_sections__';
export const RANDOM_SECTION = '__random_section__';

export type AnswerOption = {
	value: string;
	correct: boolean;
};

export const VOCABULARY: readonly VocabularyEntry[] = vocabularyData;
export const THEMES = [...new Set(VOCABULARY.map((entry) => entry.theme))];

export function vocabularyForTheme(theme: string): VocabularyEntry[] {
	return VOCABULARY.filter((entry) => entry.theme === theme);
}

export function sectionsForTheme(theme: string): string[] {
	return [...new Set(vocabularyForTheme(theme).map((entry) => entry.section))];
}

export function vocabularyForSection(theme: string, section: string): VocabularyEntry[] {
	return VOCABULARY.filter((entry) => entry.theme === theme && entry.section === section);
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

export function uniqueVocabularyForDirection(
	entries: readonly VocabularyEntry[],
	direction: VocabularyDirection
): VocabularyEntry[] {
	const prompts = new Set<string>();
	return entries.filter((entry) => {
		const prompt = normalizeAnswer(getCardContent(entry, direction).prompt);
		if (prompts.has(prompt)) return false;
		prompts.add(prompt);
		return true;
	});
}

function randomIndex(length: number, random: () => number): number {
	const value = random();
	if (!Number.isFinite(value)) return 0;
	return Math.min(Math.floor(Math.max(0, value) * length), length - 1);
}

function scopesForSelection(
	themeChoice: string,
	sectionChoice: string,
	direction: VocabularyDirection
): Array<Omit<VocabularyScope, 'entries'>> {
	const themes = themeChoice === RANDOM_THEME ? THEMES : [themeChoice];
	return themes.flatMap((theme) => {
		const sections =
			sectionChoice === ALL_SECTIONS
				? [null]
				: sectionChoice === RANDOM_SECTION
					? sectionsForTheme(theme)
					: [sectionChoice];

		return sections.map((section) => {
			const entries = section ? vocabularyForSection(theme, section) : vocabularyForTheme(theme);
			const pool = uniqueVocabularyForDirection(entries, direction);
			return { theme, section, pool };
		});
	});
}

export function maxVocabularySessionSize(
	themeChoice: string,
	sectionChoice: string,
	direction: VocabularyDirection
): number {
	return Math.max(
		0,
		...scopesForSelection(themeChoice, sectionChoice, direction).map((scope) => scope.pool.length)
	);
}

export function createVocabularySession(
	themeChoice: string,
	sectionChoice: string,
	direction: VocabularyDirection,
	quantity: number,
	random: () => number = Math.random
): VocabularyScope {
	if (!Number.isInteger(quantity) || quantity < 1) {
		throw new Error('La taille doit être un entier supérieur ou égal à 1.');
	}

	const scopes = scopesForSelection(themeChoice, sectionChoice, direction);
	const maximum = Math.max(0, ...scopes.map((scope) => scope.pool.length));
	const eligibleScopes = scopes.filter((scope) => scope.pool.length >= quantity);
	if (eligibleScopes.length === 0) {
		throw new Error(`Cette sélection contient au maximum ${maximum} cartes distinctes.`);
	}

	let selectedScope: (typeof eligibleScopes)[number];
	if (themeChoice === RANDOM_THEME) {
		const eligibleThemes = [...new Set(eligibleScopes.map((scope) => scope.theme))];
		const theme = eligibleThemes[randomIndex(eligibleThemes.length, random)];
		const themeScopes = eligibleScopes.filter((scope) => scope.theme === theme);
		selectedScope = themeScopes[randomIndex(themeScopes.length, random)];
	} else {
		selectedScope = eligibleScopes[randomIndex(eligibleScopes.length, random)];
	}

	const shuffledPool = [...selectedScope.pool];
	for (let index = 0; index < quantity; index += 1) {
		const selectedIndex = index + randomIndex(shuffledPool.length - index, random);
		[shuffledPool[index], shuffledPool[selectedIndex]] = [
			shuffledPool[selectedIndex],
			shuffledPool[index]
		];
	}

	return {
		theme: selectedScope.theme,
		section: selectedScope.section,
		pool: selectedScope.pool,
		entries: shuffledPool.slice(0, quantity)
	};
}

export function canUseMultipleChoice(
	entries: readonly VocabularyEntry[],
	direction: VocabularyDirection
): boolean {
	return (
		entries.length > 0 &&
		entries.every((entry) => {
			const correctKey = normalizeAnswer(getCardContent(entry, direction).answer);
			const distractors = new Set(
				entries
					.map((candidate) => normalizeAnswer(getCardContent(candidate, direction).answer))
					.filter((answer) => answer !== correctKey)
			);
			return distractors.size >= 3;
		})
	);
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
