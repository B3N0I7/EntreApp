import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}
	const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
	if (
		typeof body?.password !== 'string' ||
		body.password.length < 12 ||
		body.password.length > 128
	) {
		return json(
			{ error: 'Le mot de passe doit contenir entre 12 et 128 caractères.' },
			{ status: 400 }
		);
	}

	const { error } = await locals.supabase.auth.updateUser({ password: body.password });
	if (error) {
		console.error('Supabase password update failed.', error);
		return json({ error: 'Le mot de passe n’a pas pu être modifié.' }, { status: 503 });
	}
	return json({ updated: true });
};
