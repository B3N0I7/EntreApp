import { dev } from '$app/env';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE } from '#lib/server/session';

export const POST: RequestHandler = async ({ cookies, url }) => {
	cookies.delete(SESSION_COOKIE, {
		path: '/',
		httpOnly: true,
		secure: !dev && url.protocol === 'https:',
		sameSite: 'lax'
	});
	return json({ ok: true });
};
