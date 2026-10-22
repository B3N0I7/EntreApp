import { dev } from '$app/env';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrivateEnv } from '#lib/server/environment';
import { getAccount } from '#lib/accounts';
import { AppsScriptError, callAppsScript } from '#lib/server/appsScript';
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from '#lib/server/session';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const sessionSecret = getPrivateEnv('SESSION_SECRET');
	if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
		return json({ error: 'Connexion indisponible pour le moment.' }, { status: 503 });
	}
	const body = (await request.json().catch(() => null)) as {
		userId?: unknown;
		pin?: unknown;
	} | null;
	if (
		!body ||
		typeof body.userId !== 'string' ||
		typeof body.pin !== 'string' ||
		!/^\d{6,12}$/.test(body.pin)
	) {
		return json({ error: 'Identifiant ou PIN invalide.' }, { status: 400 });
	}

	const account = getAccount(body.userId);
	if (!account) return json({ error: 'Identifiant ou PIN invalide.' }, { status: 401 });

	try {
		const result = await callAppsScript<{ authenticated: boolean }>({
			action: 'login',
			userId: account.id,
			pin: body.pin
		});
		if (result.authenticated !== true) {
			return json({ error: 'Identifiant ou PIN invalide.' }, { status: 401 });
		}
	} catch (error) {
		if (error instanceof AppsScriptError && error.code === 'INVALID_CREDENTIALS') {
			return json({ error: 'Identifiant ou PIN invalide.' }, { status: 401 });
		}
		if (error instanceof AppsScriptError && error.code === 'ACCOUNT_LOCKED') {
			return json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 });
		}
		return json({ error: 'Connexion indisponible pour le moment.' }, { status: 503 });
	}

	const session = {
		userId: account.id,
		name: account.name,
		role: account.role,
		expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
	} as const;
	const token = createSessionToken(session, sessionSecret);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: !dev && url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: SESSION_DURATION_SECONDS
	});

	return json({ user: { userId: account.id, name: account.name, role: account.role } });
};
