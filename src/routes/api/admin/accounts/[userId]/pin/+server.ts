import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccount } from '#lib/accounts';
import { callAppsScript } from '#lib/server/appsScript';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Accès refusé.' }, { status: 403 });
	const account = getAccount(params.userId);
	const body = (await request.json().catch(() => null)) as { pin?: unknown } | null;
	if (!account || typeof body?.pin !== 'string' || !/^\d{6,12}$/.test(body.pin)) {
		return json({ error: 'Le nouveau PIN doit contenir de 6 à 12 chiffres.' }, { status: 400 });
	}

	try {
		await callAppsScript({
			action: 'resetPin',
			actorUserId: locals.user.userId,
			targetUserId: account.id,
			newPin: body.pin
		});
		return json({ reset: true });
	} catch {
		return json({ error: 'Le PIN n’a pas pu être réinitialisé.' }, { status: 502 });
	}
};
