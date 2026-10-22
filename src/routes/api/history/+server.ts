import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callAppsScript } from '#lib/server/appsScript';
import type { Partie, PayloadPartie } from '#lib/sheetService';

const modules = new Set(['vocabulaire-definition', 'vocabulaire-mot', 'conjugaison']);

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'guest') {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}

	const requestedUserId = url.searchParams.get('userId');
	if (requestedUserId && locals.user.role !== 'admin' && requestedUserId !== locals.user.userId) {
		return json({ error: 'Accès refusé.' }, { status: 403 });
	}

	try {
		const history = await callAppsScript<Partie[]>({
			action: 'history',
			actorUserId: locals.user.userId,
			targetUserId: locals.user.role === 'admin' ? requestedUserId : locals.user.userId
		});
		return json(history);
	} catch (error) {
		console.error('Apps Script history lookup failed.', error);
		return json({ error: 'L’historique est temporairement indisponible.' }, { status: 502 });
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || locals.user.role === 'guest') return json({ saved: false });

	const body = (await request.json().catch(() => null)) as PayloadPartie | null;
	if (
		!body ||
		!modules.has(body.module) ||
		typeof body.score !== 'string' ||
		!/^\d{1,4}\/\d{1,4}$/.test(body.score) ||
		!Array.isArray(body.erreurs) ||
		body.erreurs.length > 100
	) {
		return json({ error: 'Données de partie invalides.' }, { status: 400 });
	}

	try {
		await callAppsScript({
			action: 'savePartie',
			actorUserId: locals.user.userId,
			partie: body
		});
		return json({ saved: true });
	} catch (error) {
		console.error('Apps Script savePartie failed.', error);
		return json({ error: 'La partie n’a pas pu être enregistrée.' }, { status: 502 });
	}
};
