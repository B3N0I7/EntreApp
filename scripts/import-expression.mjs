import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = {
	file: 'fichierstxt/100 expressions francaises.txt',
	theme: 'Expressions françaises',
	idPrefix: 'expression',
	section: 'Expressions courantes'
};
const outputPath = resolve(root, 'src/lib/data/expression.json');

function importEntries() {
	const content = readFileSync(resolve(root, source.file), 'utf8');
	const entries = [];
	let currentEntry;

	for (const rawLine of content.split(/\r\n?|\n/)) {
		const line = rawLine.trim();
		if (!line || /^_+$/.test(line)) continue;

		const definitionMatch = line.match(/^signifie\s*:\s*(.+)$/iu);
		if (definitionMatch) {
			if (!currentEntry) {
				throw new Error(`Definition without an expression in ${source.file}: ${line}`);
			}
			currentEntry.definition = definitionMatch[1].trim();
			currentEntry = undefined;
			continue;
		}

		if (currentEntry) {
			throw new Error(`Missing definition in ${source.file}: ${currentEntry.word}`);
		}
		currentEntry = {
			id: `${source.idPrefix}-${String(entries.length + 1).padStart(3, '0')}`,
			theme: source.theme,
			section: source.section,
			word: line,
			definition: ''
		};
		entries.push(currentEntry);
	}

	const incomplete = entries.filter((entry) => !entry.definition);
	if (incomplete.length > 0) {
		throw new Error(
			`Missing definitions in ${source.file}: ${incomplete.map((entry) => entry.word).join(', ')}`
		);
	}
	if (entries.length === 0) throw new Error(`No expressions found in ${source.file}`);

	return entries;
}

const expressions = importEntries();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(expressions, null, 2)}\n`, 'utf8');
console.log(`${source.theme}: ${expressions.length} entrées`);
console.log(`Données écrites dans ${outputPath}`);
