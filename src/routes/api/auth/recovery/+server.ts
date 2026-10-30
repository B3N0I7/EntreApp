import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (!locals.supabase) return json({ error: 'Service indisponible.' }, { status: 503 });
	const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
	if (
		typeof body?.email !== 'string' ||
		body.email.length > 320 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
	) {
		return json({ error: 'Saisissez une adresse e-mail valide.' }, { status: 400 });
	}

	const { error } = await locals.supabase.auth.resetPasswordForEmail(body.email.trim(), {
		redirectTo: new URL('/auth/callback?next=/compte/mot-de-passe', url).toString()
	});
	if (error) {
		console.error('Supabase password recovery failed.', error);
		return json({ error: 'Envoi du lien temporairement indisponible.' }, { status: 503 });
	}
	return json({ sent: true });
};
