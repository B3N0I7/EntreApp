import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type {
	Erreur,
	ModuleType,
	Partie,
	PayloadPartie,
	TentativeReponse
} from '#lib/sheetService';

const modules = new Set([
	'vocabulaire-definition',
	'vocabulaire-mot',
	'expressions-word-to-definition',
	'expressions-definition-to-word',
	'conjugaison'
]);

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}

	const requestedUserId = url.searchParams.get('userId');
	if (requestedUserId && locals.user.role !== 'admin' && requestedUserId !== locals.user.userId) {
		return json({ error: 'Accès refusé.' }, { status: 403 });
	}

	try {
		let query = locals.supabase
			.from('activity_sessions')
			.select('id, user_id, module, score, created_at, answer_attempts(details, is_correct)')
			.order('created_at', { ascending: false })
			.limit(200);
		const targetUserId = locals.user.role === 'admin' ? requestedUserId : locals.user.userId;
		if (targetUserId) query = query.eq('user_id', targetUserId);
		const { data, error } = await query;
		if (error) throw error;
		const history: Partie[] = (data ?? []).map((row) => ({
			id: row.id,
			date: row.created_at,
			userId: row.user_id,
			module: row.module as ModuleType,
			score: row.score,
			erreurs: (row.answer_attempts ?? [])
				.filter((attempt) => !attempt.is_correct && attempt.details)
				.map((attempt) => attempt.details as unknown as Erreur)
		}));
		return json(history);
	} catch (error) {
		console.error('Supabase history lookup failed.', error);
		return json({ error: 'L’historique est temporairement indisponible.' }, { status: 502 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	const body = (await request.json().catch(() => null)) as PayloadPartie | null;
	if (!locals.user) return json({ error: 'Connexion requise.' }, { status: 401 });
	if (locals.user.role === 'guest') {
		return body?.ownerId
			? json({ error: 'Compte actif différent.' }, { status: 409 })
			: json({ saved: false });
	}
	if (body?.ownerId && body.ownerId !== locals.user.userId) {
		return json({ error: 'Compte actif différent.' }, { status: 409 });
	}
	if (!locals.supabase) return json({ error: 'Enregistrement indisponible.' }, { status: 503 });

	if (
		!body ||
		!isUuid(body.sessionId) ||
		!modules.has(body.module) ||
		typeof body.score !== 'string' ||
		!isValidScore(body.score) ||
		!Array.isArray(body.erreurs) ||
		body.erreurs.length > 100 ||
		!body.erreurs.every(isErreur) ||
		!Array.isArray(body.tentatives) ||
		body.tentatives.length > 100 ||
		!body.tentatives.every((tentative) => isTentative(tentative, body.module))
	) {
		return json({ error: 'Données de partie invalides.' }, { status: 400 });
	}
	if (body.tentatives.length > 0) {
		const [correctCount, attemptCount] = body.score.split('/').map(Number);
		if (
			attemptCount !== body.tentatives.length ||
			correctCount !== body.tentatives.filter(({ isCorrect }) => isCorrect).length ||
			body.erreurs.length !== body.tentatives.filter(({ isCorrect }) => !isCorrect).length
		) {
			return json({ error: 'Données de partie incohérentes.' }, { status: 400 });
		}
	}

	try {
		const attempts = body.tentatives.length
			? body.tentatives.map((tentative, position) => ({
					position,
					item_id: tentative.itemId,
					direction: tentative.direction,
					mode: tentative.mode,
					response: tentative.response,
					correction: tentative.correction,
					is_correct: tentative.isCorrect,
					details: tentative.details
				}))
			: body.erreurs.map((erreur, position) => ({
					position,
					item_id: errorItemId(erreur),
					direction: 'direction' in erreur ? erreur.direction : null,
					mode: 'mode' in erreur ? erreur.mode : null,
					response: erreur.reponseEleve,
					correction: erreur.correction,
					is_correct: false,
					details: erreur
				}));
		const { error } = await locals.supabase.rpc('record_activity_session', {
			p_session_id: body.sessionId,
			p_module: body.module,
			p_score: body.score,
			p_attempts: attempts
		});
		if (error) throw error;
		return json({ saved: true });
	} catch (error) {
		console.error('Supabase history save failed.', error);
		return json({ error: 'La partie n’a pas pu être enregistrée.' }, { status: 502 });
	}
};

function isUuid(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	);
}

function errorItemId(error: Erreur): string {
	return 'entryId' in error ? error.entryId : `${error.verbeId}:${error.tempsId}:${error.pronom}`;
}

function isValidScore(score: string): boolean {
	const match = /^(\d{1,4})\/(\d{1,4})$/.exec(score);
	return Boolean(match && Number(match[1]) <= Number(match[2]) && Number(match[2]) > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength = 2000): value is string {
	return typeof value === 'string' && value.length <= maxLength;
}

function isErreur(value: unknown): value is Erreur {
	if (!isRecord(value)) return false;
	if ('entryId' in value) {
		return (
			isText(value.entryId, 200) &&
			(value.direction === 'word-to-definition' || value.direction === 'definition-to-word') &&
			(value.mode === 'self-assessment' || value.mode === 'multiple-choice') &&
			isText(value.mot) &&
			isText(value.reponseEleve) &&
			isText(value.correction)
		);
	}
	return (
		isText(value.verbeId, 200) &&
		isText(value.tempsId, 200) &&
		isText(value.verbe) &&
		isText(value.temps) &&
		isText(value.pronom, 100) &&
		isText(value.reponseEleve) &&
		Array.isArray(value.correction) &&
		value.correction.length > 0 &&
		value.correction.every((answer) => isText(answer))
	);
}

function isTentative(value: unknown, module: ModuleType): value is TentativeReponse {
	if (!isRecord(value)) return false;
	const isConjugation = module === 'conjugaison';
	const validDirection =
		value.direction === null ||
		value.direction === 'word-to-definition' ||
		value.direction === 'definition-to-word';
	const validMode =
		value.mode === null || value.mode === 'self-assessment' || value.mode === 'multiple-choice';
	const validCorrection =
		isText(value.correction) ||
		(Array.isArray(value.correction) &&
			value.correction.length > 0 &&
			value.correction.every((answer) => isText(answer)));
	const validDetails =
		value.details === null ||
		(isErreur(value.details) &&
			(isConjugation ? 'verbeId' in value.details : 'entryId' in value.details));

	return (
		isText(value.itemId, 200) &&
		value.itemId.length > 0 &&
		(isConjugation
			? value.direction === null && value.mode === null
			: validDirection && validMode) &&
		isText(value.response) &&
		validCorrection &&
		typeof value.isCorrect === 'boolean' &&
		validDetails &&
		(value.isCorrect ? value.details === null : value.details !== null)
	);
}
