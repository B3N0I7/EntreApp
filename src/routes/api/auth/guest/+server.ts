import { dev } from '$app/env';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPrivateEnv } from '#lib/server/environment';
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from '#lib/server/session';

export const POST: RequestHandler = async ({ cookies, url }) => {
	const sessionSecret = getPrivateEnv('SESSION_SECRET');
	if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
		return json({ error: 'Mode invité indisponible.' }, { status: 503 });
	}
	const session = {
		userId: 'guest',
		name: 'Invité',
		role: 'guest',
		expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
	} as const;
	const token = createSessionToken(session, sessionSecret);
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		secure: !dev && url.protocol === 'https:',
		sameSite: 'lax'
	});

	return json({ user: session });
};
