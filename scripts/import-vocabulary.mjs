import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputPath = resolve(root, 'src/lib/data/vocabulary.json');

const sources = [
	{
		file: 'fichierstxt/les relations familiales et l amour.txt',
		theme: 'Les relations familiales et l’amour',
		idPrefix: 'famille',
		bulletEntries: true
	},
	{
		file: 'fichierstxt/le tourisme et les voyages.txt',
		theme: 'Le tourisme et les voyages',
		idPrefix: 'voyage',
		bulletEntries: false
	}
];

function importEntries(source) {
	const content = readFileSync(resolve(root, source.file), 'utf8');
	const entries = [];
	let currentEntry;

	for (const rawLine of content.split(/\r?\n/)) {
		let line = rawLine.trim();
		if (!line || /^_+$/.test(line)) continue;

		const isBullet = line.startsWith('•');
		if (source.bulletEntries && !isBullet) continue;
		if (isBullet) line = line.slice(1).trim();

		if (source.bulletEntries && /^soit\b/i.test(line)) {
			if (!currentEntry) {
				throw new Error(`Definition continuation without a term in ${source.file}: ${line}`);
			}
			currentEntry.definition = [currentEntry.definition, line].filter(Boolean).join(' ');
			continue;
		}

		const separator = line.indexOf(':');
		if (separator < 0) continue;

		const word = line.slice(0, separator).trim();
		const definition = line.slice(separator + 1).trim();
		if (!definition && !source.bulletEntries) continue;
		if (!word) throw new Error(`Missing term in ${source.file}: ${rawLine}`);

		currentEntry = {
			id: `${source.idPrefix}-${String(entries.length + 1).padStart(3, '0')}`,
			theme: source.theme,
			word,
			definition
		};
		entries.push(currentEntry);
	}

	const incomplete = entries.filter((entry) => !entry.definition);
	if (incomplete.length > 0) {
		throw new Error(
			`Missing definitions in ${source.file}: ${incomplete.map((entry) => entry.word).join(', ')}`
		);
	}
	if (entries.length === 0) throw new Error(`No vocabulary entries found in ${source.file}`);

	return entries;
}

const vocabulary = sources.flatMap(importEntries);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(vocabulary, null, 2)}\n`, 'utf8');

for (const source of sources) {
	const count = vocabulary.filter((entry) => entry.theme === source.theme).length;
	console.log(`${source.theme}: ${count} entrées`);
}
console.log(`Données écrites dans ${outputPath}`);
