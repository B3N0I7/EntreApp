import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { getPrivateEnv } from '#lib/server/environment';
import { SESSION_COOKIE, verifySessionToken } from '#lib/server/session';
import { createSupabaseServerClient } from '#lib/server/supabase';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createSupabaseServerClient(event.cookies);
	event.locals.supabase = supabase;
	event.locals.user = null;

	if (supabase) {
		try {
			const { data: authData } = await supabase.auth.getUser();
			if (authData.user) {
				const { data: profile } = await supabase
					.from('profiles')
					.select('display_name, role')
					.eq('id', authData.user.id)
					.maybeSingle();
				if (profile && (profile.role === 'student' || profile.role === 'admin')) {
					event.locals.user = {
						userId: authData.user.id,
						name: profile.display_name,
						role: profile.role
					};
				}
			}
		} catch (error) {
			console.error('Supabase session lookup failed.', error);
		}
	}

	if (!event.locals.user) {
		event.locals.user = verifySessionToken(
			event.cookies.get(SESSION_COOKIE),
			getPrivateEnv('SESSION_SECRET') ?? ''
		);
	}
	const routeId = event.route.id;
	if (routeId && !routeId.startsWith('/api/')) {
		if (!event.locals.user && routeId !== '/login' && routeId !== '/auth/callback') {
			redirect(303, '/login');
		}
		if (event.locals.user && routeId === '/login') redirect(303, '/');
	}

	return resolve(event);
};
