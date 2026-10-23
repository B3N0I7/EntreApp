// Types pour structurer les données de votre application

export interface ErreurVocabulaire {
	entryId: string;
	direction: 'word-to-definition' | 'definition-to-word';
	mode: 'self-assessment' | 'multiple-choice';
	mot: string;
	reponseEleve: string;
	correction: string;
}

export interface ErreurConjugaison {
	verbeId: string;
	tempsId: string;
	verbe: string;
	temps: string;
	pronom: string;
	reponseEleve: string;
	correction: string[];
}

export type Erreur = ErreurVocabulaire | ErreurConjugaison;

export type ModuleType =
	| 'vocabulaire-definition'
	| 'vocabulaire-mot'
	| 'expressions-word-to-definition'
	| 'expressions-definition-to-word'
	| 'conjugaison';

export interface Partie {
	date: string;
	userId?: string;
	module: ModuleType;
	score: string;
	erreurs: Erreur[];
}

export interface PayloadPartie {
	module: ModuleType;
	score: string;
	erreurs: Erreur[];
}

export async function enregistrerPartie(
	module: ModuleType,
	score: string,
	erreurs: Erreur[]
): Promise<void> {
	const response = await fetch('/api/history', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ module, score, erreurs } satisfies PayloadPartie)
	});
	if (!response.ok) throw new Error('La partie n’a pas pu être enregistrée.');
}

export async function chargerHistorique(userId?: string): Promise<Partie[]> {
	const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
	const response = await fetch(`/api/history${query}`);
	if (!response.ok) throw new Error('L’historique n’a pas pu être chargé.');
	return (await response.json()) as Partie[];
}
