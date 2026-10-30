import { dev } from '$app/env';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE } from '#lib/server/session';

export const POST: RequestHandler = async ({ cookies, locals, url }) => {
	if (locals.user && locals.user.role !== 'guest' && locals.supabase) {
		await locals.supabase.auth.signOut();
	}
	cookies.delete(SESSION_COOKIE, {
		path: '/',
		httpOnly: true,
		secure: !dev && url.protocol === 'https:',
		sameSite: 'lax'
	});
	return json({ ok: true });
};
