import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.supabase) {
		return json({ error: 'Connexion indisponible pour le moment.' }, { status: 503 });
	}
	const body = (await request.json().catch(() => null)) as {
		email?: unknown;
		password?: unknown;
	} | null;
	if (
		!body ||
		typeof body.email !== 'string' ||
		body.email.length > 320 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
		typeof body.password !== 'string' ||
		body.password.length < 1 ||
		body.password.length > 256
	) {
		return json({ error: 'Adresse e-mail ou mot de passe invalide.' }, { status: 400 });
	}

	try {
		const { data, error } = await locals.supabase.auth.signInWithPassword({
			email: body.email.trim(),
			password: body.password
		});
		if (error || !data.user) {
			return json({ error: 'Adresse e-mail ou mot de passe invalide.' }, { status: 401 });
		}

		const { data: profile, error: profileError } = await locals.supabase
			.from('profiles')
			.select('id, display_name, role')
			.eq('id', data.user.id)
			.maybeSingle();
		if (profileError || !profile || (profile.role !== 'student' && profile.role !== 'admin')) {
			await locals.supabase.auth.signOut();
			return json(
				{ error: 'Ce compte n’est pas encore configuré. Contactez Prof.' },
				{ status: profileError ? 503 : 403 }
			);
		}
		return json({ user: { userId: profile.id, name: profile.display_name, role: profile.role } });
	} catch (error) {
		console.error('Supabase login failed.', error);
		return json({ error: 'Connexion indisponible pour le moment.' }, { status: 503 });
	}
};
