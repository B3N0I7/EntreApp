import { describe, expect, it } from 'vitest';
import { storeReplay, takeReplay } from './replay';

function createStorage() {
	const values = new Map<string, string>();
	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key)
	};
}

describe('replay handoff', () => {
	it('consumes a replay only for its matching module', () => {
		const storage = createStorage();
		const errors = [
			{
				entryId: 'mot-1',
				direction: 'word-to-definition' as const,
				mode: 'self-assessment' as const,
				mot: 'mot',
				reponseEleve: '',
				correction: 'définition'
			}
		];

		storeReplay({ module: 'vocabulaire-mot', erreurs: errors }, storage);
		expect(takeReplay('conjugaison', storage)).toBeNull();
		expect(takeReplay('vocabulaire-mot', storage)).toBeNull();

		storeReplay({ module: 'vocabulaire-mot', erreurs: errors }, storage);
		expect(takeReplay('vocabulaire-mot', storage)).toEqual(errors);
		expect(takeReplay('vocabulaire-mot', storage)).toBeNull();
	});
});
