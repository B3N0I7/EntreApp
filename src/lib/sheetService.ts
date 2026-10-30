// Types pour structurer les données de votre application
import { enqueueHistory, listPendingHistory, removePendingHistory } from './historyQueue';

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
export type TentativeReponse = {
	itemId: string;
	direction: ErreurVocabulaire['direction'] | null;
	mode: ErreurVocabulaire['mode'] | null;
	response: string;
	correction: string | string[];
	isCorrect: boolean;
	details: Erreur | null;
};

export type ModuleType =
	| 'vocabulaire-definition'
	| 'vocabulaire-mot'
	| 'expressions-word-to-definition'
	| 'expressions-definition-to-word'
	| 'conjugaison';

export interface Partie {
	date: string;
	userId?: string;
	id?: string;
	module: ModuleType;
	score: string;
	erreurs: Erreur[];
}

export interface PayloadPartie {
	sessionId: string;
	module: ModuleType;
	score: string;
	erreurs: Erreur[];
	tentatives: TentativeReponse[];
	ownerId?: string;
}

export async function enregistrerPartie(
	module: ModuleType,
	score: string,
	erreurs: Erreur[],
	tentatives: TentativeReponse[] = [],
	ownerId?: string
): Promise<'saved' | 'pending' | 'skipped'> {
	const sessionId = crypto.randomUUID();
	const payload = { sessionId, module, score, erreurs, tentatives } satisfies PayloadPartie;
	if (!ownerId) {
		try {
			await postPartie(payload);
		} catch {
			return 'skipped';
		}
		return 'skipped';
	}

	await enqueueHistory({ ownerId, payload });
	try {
		await flushPendingHistory(ownerId);
		const pending = await listPendingHistory(ownerId);
		return pending.some((item) => item.payload.sessionId === sessionId) ? 'pending' : 'saved';
	} catch {
		return 'pending';
	}
}

export async function flushPendingHistory(ownerId: string): Promise<void> {
	const pending = await listPendingHistory(ownerId);
	for (const item of pending) {
		try {
			const saved = await postPartie(item.payload, ownerId);
			if (!saved) break;
			await removePendingHistory(item.payload.sessionId);
		} catch {
			break;
		}
	}
}

async function postPartie(payload: PayloadPartie, ownerId?: string): Promise<boolean> {
	const response = await fetch('/api/history', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(ownerId ? { ...payload, ownerId } : payload)
	});
	if (!response.ok) return false;
	const result = (await response.json().catch(() => null)) as { saved?: boolean } | null;
	return result?.saved === true;
}

export async function chargerHistorique(
	userId?: string,
	ownerId?: string
): Promise<{ parties: Partie[]; fromCache: boolean }> {
	const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
	const cacheKey = ownerId ? `entre.history.${ownerId}.${userId ?? 'all'}` : null;
	try {
		const response = await fetch(`/api/history${query}`);
		if (!response.ok) throw new Error('L’historique n’a pas pu être chargé.');
		const parties = (await response.json()) as Partie[];
		if (cacheKey && typeof window !== 'undefined') {
			window.sessionStorage.setItem(cacheKey, JSON.stringify(parties));
		}
		return { parties, fromCache: false };
	} catch {
		if (cacheKey && typeof window !== 'undefined') {
			try {
				const cached = window.sessionStorage.getItem(cacheKey);
				if (cached) return { parties: JSON.parse(cached) as Partie[], fromCache: true };
			} catch {
				window.sessionStorage.removeItem(cacheKey);
			}
		}
		throw new Error('L’historique n’a pas pu être chargé.');
	}
}
