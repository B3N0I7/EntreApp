import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputPath = resolve(root, 'src/lib/data/conjugation.json');
const persons = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles'];
const sourceTenses = [
	{ id: 'present', label: 'Présent' },
	{ id: 'passeCompose', label: 'Passé composé' },
	{ id: 'imparfait', label: 'Imparfait' },
	{ id: 'plusQueParfait', label: 'Plus-que-parfait' },
	{ id: 'futurSimple', label: 'Futur simple' }
];

function normalize(value) {
	return value
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase('fr')
		.trim();
}

function slug(value) {
	return normalize(value)
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-|-$/gu, '');
}

function readVerbNotes() {
	const content = readFileSync(resolve(root, 'fichierstxt/liste de 30 verbes.txt'), 'utf8');
	const notesByInfinitive = new Map();
	let current;

	for (const line of content.split(/\r?\n/u)) {
		const heading = line.match(/^\s*\d+\.\s+(.+?)\s*$/u);
		if (heading) {
			const infinitive = heading[1].trim().toLocaleLowerCase('fr');
			current = { infinitive, notes: [] };
			notesByInfinitive.set(normalize(infinitive), current);
		} else if (current && line.trim()) {
			current.notes.push(line.trim());
		}
	}

	if (notesByInfinitive.size !== 30) {
		throw new Error(`Expected 30 verb notes, found ${notesByInfinitive.size}`);
	}
	return notesByInfinitive;
}

function expandOptionalEndings(value) {
	const match = value.match(/\(([^()]*)\)/u);
	if (!match) return [{ value, choices: [] }];

	const before = value.slice(0, match.index);
	const after = value.slice(match.index + match[0].length);
	return [
		...expandOptionalEndings(`${before}${match[1]}${after}`).map((result) => ({
			value: result.value,
			choices: [match[1], ...result.choices]
		})),
		...expandOptionalEndings(`${before}${after}`).map((result) => ({
			value: result.value,
			choices: ['', ...result.choices]
		}))
	];
}

function splitAlternatives(segment) {
	const marker = segment.indexOf('(ou ');
	if (marker < 0) return [segment.trim()];

	const main = segment.slice(0, marker).trim();
	const alternative = segment
		.slice(marker + 4)
		.trim()
		.replace(/\)$/u, '')
		.trim();
	return [main, alternative];
}

function formsFromSegment(segment) {
	const alternatives = splitAlternatives(segment);
	const forms = {};

	for (const alternative of alternatives) {
		const match = alternative.match(/^(ils\/elles|il\/elle|j'|je|tu|nous|vous|il)\s*(.+)$/u);
		if (!match) throw new Error(`Cannot parse conjugation form: ${alternative}`);
		const [, sourcePerson, ending] = match;
		const targets =
			sourcePerson === 'il/elle'
				? ['il', 'elle']
				: sourcePerson === 'ils/elles'
					? ['ils', 'elles']
					: [sourcePerson === "j'" ? 'je' : sourcePerson];

		for (const person of targets) {
			const expanded = expandOptionalEndings(ending);
			const hasGenderEnding = expanded.some((form) => form.choices.includes('e'));
			const compatible = hasGenderEnding
				? expanded.filter((form) => {
						if (person === 'il' || person === 'ils') return !form.choices.includes('e');
						if (person === 'elle' || person === 'elles') return form.choices.includes('e');
						return true;
					})
				: expanded;

			const prefix = sourcePerson === "j'" ? "j'" : person;
			for (const form of compatible) {
				const fullForm = `${prefix}${prefix.endsWith("'") ? '' : ' '}${form.value}`;
				forms[person] ??= [];
				if (!forms[person].includes(fullForm)) forms[person].push(fullForm);
			}
		}
	}

	return forms;
}

function parseSourceConjugations() {
	const content = readFileSync(resolve(root, 'fichierstxt/conjugaison de 30 verbes.txt'), 'utf8');
	const verbs = [];
	let current;

	for (const rawLine of content.split(/\r?\n/u)) {
		const line = rawLine.replace(/\*/gu, '').trim();
		const heading = line.match(/^\d+\.\s+(.+?)\s*$/u);
		if (heading) {
			const infinitive = heading[1]
				.replace(/\s+\(.*$/u, '')
				.trim()
				.toLocaleLowerCase('fr');
			current = { infinitive, sourceTenses: {} };
			verbs.push(current);
			continue;
		}
		if (!current || !line.includes(':')) continue;

		const separator = line.indexOf(':');
		const label = line.slice(0, separator).trim();
		const sourceTense = sourceTenses.find((tense) => normalize(tense.label) === normalize(label));
		if (!sourceTense) continue;
		if (current.sourceTenses[sourceTense.id]) {
			throw new Error(`Duplicate ${label} for ${current.infinitive}`);
		}

		const segments = line
			.slice(separator + 1)
			.split(/,\s*/u)
			.map((segment) => segment.trim())
			.filter(Boolean);
		const forms = {};
		for (const segment of segments) {
			for (const [person, answers] of Object.entries(formsFromSegment(segment))) {
				if (forms[person])
					throw new Error(`Duplicate ${person} in ${label} for ${current.infinitive}`);
				forms[person] = answers;
			}
		}
		current.sourceTenses[sourceTense.id] = forms;
	}

	if (verbs.length !== 30) throw new Error(`Expected 30 conjugation blocks, found ${verbs.length}`);
	return verbs;
}

const verbNotes = readVerbNotes();
const sourceVerbs = parseSourceConjugations();
const sourceByInfinitive = new Map(sourceVerbs.map((verb) => [normalize(verb.infinitive), verb]));
if (sourceByInfinitive.size !== 30)
	throw new Error('Duplicate verb names in the conjugation source');

const aller = sourceByInfinitive.get('aller');
if (!aller?.sourceTenses.present)
	throw new Error('The present tense of aller is required for futur proche');

const verbs = [...verbNotes.values()].map((note) => {
	const source = sourceByInfinitive.get(normalize(note.infinitive));
	if (!source) throw new Error(`Missing conjugations for ${note.infinitive}`);

	const conjugations = { ...source.sourceTenses };
	for (const tense of sourceTenses) {
		if (!conjugations[tense.id]) throw new Error(`Missing ${tense.label} for ${note.infinitive}`);
	}

	const isImpersonal = normalize(note.infinitive) === 'falloir';
	for (const tense of sourceTenses) {
		const expectedPersons = isImpersonal ? ['il'] : persons;
		const missing = expectedPersons.filter((person) => !conjugations[tense.id][person]?.length);
		if (missing.length) {
			throw new Error(`Missing ${tense.label} forms for ${note.infinitive}: ${missing.join(', ')}`);
		}
	}

	conjugations.futurProche = {};
	for (const person of isImpersonal ? ['il'] : persons) {
		const auxiliaryForms = aller.sourceTenses.present[person];
		if (!auxiliaryForms?.length) throw new Error(`Missing aller present form for ${person}`);
		conjugations.futurProche[person] = auxiliaryForms.map((form) => `${form} ${note.infinitive}`);
	}

	return {
		id: slug(note.infinitive),
		infinitive: note.infinitive,
		impersonal: isImpersonal,
		notes: note.notes,
		conjugations
	};
});

const data = {
	schemaVersion: 1,
	persons,
	tenses: [
		...sourceTenses,
		{ id: 'futurProche', label: 'Futur proche', derivedFrom: 'Présent d’aller + infinitif' }
	],
	verbs
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(data, null, '\t')}\n`, 'utf8');
console.log(`Imported ${verbs.length} verbs and ${data.tenses.length} tenses to ${outputPath}`);
