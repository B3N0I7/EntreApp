import { describe, expect, it } from 'vitest';
import { drawPerson, PEOPLE } from './draw';

describe('drawPerson', () => {
	it('draws every person once, then starts a new cycle', () => {
		let available: readonly string[] = [...PEOPLE];
		const drawn: string[] = [];

		for (let index = 0; index < PEOPLE.length; index += 1) {
			const result = drawPerson(available, () => 0);
			drawn.push(result.selected);
			available = result.remaining;
			expect(result.cycleComplete).toBe(index === PEOPLE.length - 1);
		}

		expect(drawn).toEqual(PEOPLE);
		expect(new Set(drawn).size).toBe(PEOPLE.length);
		expect(available).toEqual(PEOPLE);

		const nextCycle = drawPerson(available, () => 0.99);
		expect(nextCycle.selected).toBe('Prof');
		expect(nextCycle.remaining).toHaveLength(PEOPLE.length - 1);
		expect(nextCycle.cycleComplete).toBe(false);
	});

	it('rejects an empty list', () => {
		expect(() => drawPerson([])).toThrow('Cannot draw from an empty list');
	});
});
