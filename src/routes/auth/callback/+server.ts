import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const code = url.searchParams.get('code');
	if (!code || !locals.supabase) redirect(303, '/login?auth=failed');

	const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (error) redirect(303, '/login?auth=failed');

	const next = url.searchParams.get('next');
	redirect(303, next === '/compte/mot-de-passe' ? next : '/');
};
