import type { AnswerMode, VocabularyDirection } from './vocabulary';

export type StudyActivity = 'vocabulary' | 'expressions' | 'conjugation';
export type QuizPreferences = {
	answerMode?: AnswerMode;
	direction?: VocabularyDirection;
	verbChoice?: string;
	tenseChoice?: string;
};

function storageKey(activity: StudyActivity): string {
	return `entre.study-preferences.${activity}`;
}

function readLocalPreferences(activity: StudyActivity): QuizPreferences {
	if (typeof window === 'undefined') return {};
	try {
		const parsed = JSON.parse(
			window.localStorage.getItem(storageKey(activity)) ?? '{}'
		) as QuizPreferences;
		return {
			...(parsed.answerMode === 'self-assessment' || parsed.answerMode === 'multiple-choice'
				? { answerMode: parsed.answerMode }
				: {}),
			...(parsed.direction === 'word-to-definition' || parsed.direction === 'definition-to-word'
				? { direction: parsed.direction }
				: {}),
			...(typeof parsed.verbChoice === 'string' ? { verbChoice: parsed.verbChoice } : {}),
			...(typeof parsed.tenseChoice === 'string' ? { tenseChoice: parsed.tenseChoice } : {})
		};
	} catch {
		return {};
	}
}

export async function loadStudyPreferences(activity: StudyActivity): Promise<QuizPreferences> {
	const local = readLocalPreferences(activity);
	try {
		const response = await fetch(`/api/preferences?activity=${activity}`);
		if (!response.ok) return local;
		const settings = (await response.json()) as QuizPreferences;
		const valid = {
			...(settings.answerMode === 'self-assessment' || settings.answerMode === 'multiple-choice'
				? { answerMode: settings.answerMode }
				: {}),
			...(settings.direction === 'word-to-definition' || settings.direction === 'definition-to-word'
				? { direction: settings.direction }
				: {}),
			...(typeof settings.verbChoice === 'string' ? { verbChoice: settings.verbChoice } : {}),
			...(typeof settings.tenseChoice === 'string' ? { tenseChoice: settings.tenseChoice } : {})
		};
		window.localStorage.setItem(storageKey(activity), JSON.stringify(valid));
		return valid;
	} catch {
		return local;
	}
}

export async function saveStudyPreferences(
	activity: StudyActivity,
	settings: QuizPreferences
): Promise<void> {
	const merged = { ...readLocalPreferences(activity), ...settings };
	if (typeof window !== 'undefined') {
		window.localStorage.setItem(storageKey(activity), JSON.stringify(merged));
	}
	try {
		await fetch('/api/preferences', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ activity, settings: merged })
		});
	} catch {
		// Local preferences remain available when the server cannot be reached.
	}
}
