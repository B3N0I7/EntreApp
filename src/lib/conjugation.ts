import data from './data/conjugation.json';

export const PERSONS = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'] as const;
export type Person = (typeof PERSONS)[number];

export const TENSES = [
	{ id: 'present', label: 'Présent' },
	{ id: 'passeCompose', label: 'Passé composé' },
	{ id: 'imparfait', label: 'Imparfait' },
	{ id: 'plusQueParfait', label: 'Plus-que-parfait' },
	{ id: 'futurProche', label: 'Futur proche' },
	{ id: 'futurSimple', label: 'Futur simple' }
] as const;

export type TenseId = (typeof TENSES)[number]['id'];
export type ConjugationTable = Partial<Record<Person, string[]>>;

export type ConjugationVerb = {
	id: string;
	infinitive: string;
	impersonal: boolean;
	notes: string[];
	conjugations: Record<TenseId, ConjugationTable>;
};

export type ConjugationData = {
	schemaVersion: number;
	persons: Person[];
	tenses: { id: TenseId; label: string; derivedFrom?: string }[];
	verbs: ConjugationVerb[];
};

export const CONJUGATION_DATA = data as ConjugationData;
export const VERBS = CONJUGATION_DATA.verbs;

export function getVerb(verbId: string): ConjugationVerb | undefined {
	return VERBS.find((verb) => verb.id === verbId);
}

export function getPronouns(verb: ConjugationVerb, tense: TenseId): Person[] {
	return PERSONS.filter((person) => (verb.conjugations[tense][person]?.length ?? 0) > 0);
}

export function getAcceptedAnswers(
	verb: ConjugationVerb,
	tense: TenseId,
	person: Person
): string[] {
	return verb.conjugations[tense][person] ?? [];
}

export function normalizeConjugationAnswer(value: string): string {
	return value
		.normalize('NFKC')
		.replace(/[’‘‛]/gu, "'")
		.replace(/\s+/gu, ' ')
		.trim()
		.toLocaleLowerCase('fr');
}

export function isCorrectConjugation(input: string, acceptedAnswers: readonly string[]): boolean {
	const normalizedInput = normalizeConjugationAnswer(input);
	return acceptedAnswers.some((answer) => normalizeConjugationAnswer(answer) === normalizedInput);
}

export type PairSelection = {
	verbId: string;
	tenseId: TenseId;
};

export function chooseConjugationPair(
	verbId: string | null,
	tenseId: TenseId | null,
	usedPairs: ReadonlySet<string> = new Set(),
	random: () => number = Math.random,
	excludedItemIds?: ReadonlySet<string>
): PairSelection {
	const candidatePairs: PairSelection[] = [];
	const candidateVerbs = verbId ? VERBS.filter((verb) => verb.id === verbId) : VERBS;
	const candidateTenses = tenseId ? TENSES.filter((tense) => tense.id === tenseId) : TENSES;

	for (const verb of candidateVerbs) {
		for (const tense of candidateTenses) {
			if (getPronouns(verb, tense.id).length > 0) {
				candidatePairs.push({ verbId: verb.id, tenseId: tense.id });
			}
		}
	}

	const reviewablePairs = excludedItemIds
		? candidatePairs.filter(({ verbId: candidateVerb, tenseId: candidateTense }) =>
				getPronouns(getVerb(candidateVerb)!, candidateTense).some(
					(person) => !excludedItemIds.has(`${candidateVerb}:${candidateTense}:${person}`)
				)
			)
		: candidatePairs;
	if (reviewablePairs.length === 0) throw new Error('Aucune question arrivée à échéance.');

	const unusedPairs = reviewablePairs.filter(
		({ verbId: candidateVerb, tenseId: candidateTense }) =>
			verbId && tenseId ? true : !usedPairs.has(`${candidateVerb}:${candidateTense}`)
	);
	const pool = unusedPairs.length > 0 ? unusedPairs : reviewablePairs;
	const randomIndex = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	return pool[randomIndex];
}
