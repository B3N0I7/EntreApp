export const PEOPLE = [
	'Abdulnaser',
	'Ali',
	'Fatima',
	'Farzana',
	'Gulnaz',
	'Husna',
	'Manar',
	'Maoud',
	'Olga',
	'Pema',
	'Sepideh',
	'Tsogyal',
	'Vitalii',
	'Prof'
] as const;

export type DrawResult = {
	selected: string;
	remaining: readonly string[];
	cycleComplete: boolean;
};

export function drawPerson(
	available: readonly string[],
	random: () => number = Math.random
): DrawResult {
	if (available.length === 0) {
		throw new Error('Cannot draw from an empty list');
	}

	const selectedIndex = Math.floor(random() * available.length);
	const selected = available[selectedIndex];
	const remaining = available.filter((_, index) => index !== selectedIndex);
	const cycleComplete = remaining.length === 0;

	return {
		selected,
		remaining: cycleComplete ? PEOPLE : remaining,
		cycleComplete
	};
}
