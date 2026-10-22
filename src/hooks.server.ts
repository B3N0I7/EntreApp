import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getPrivateEnv } from '#lib/server/environment';
import { SESSION_COOKIE, verifySessionToken } from '#lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = verifySessionToken(
		event.cookies.get(SESSION_COOKIE),
		getPrivateEnv('SESSION_SECRET') ?? ''
	);
	const routeId = event.route.id;
	if (routeId && !routeId.startsWith('/api/')) {
		if (!event.locals.user && routeId !== '/login') redirect(303, '/login');
		if (event.locals.user && routeId === '/login') redirect(303, '/');
	}

	return resolve(event);
};
