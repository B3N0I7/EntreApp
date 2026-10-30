import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSupabaseAdminClient } from '#lib/server/supabase';

export const GET: RequestHandler = async ({ locals }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Accès refusé.' }, { status: 403 });
	if (!locals.supabase) return json({ error: 'Supabase est indisponible.' }, { status: 503 });
	const { data, error } = await locals.supabase
		.from('profiles')
		.select('id, display_name')
		.order('display_name');
	if (error) return json({ error: 'Impossible de charger les comptes.' }, { status: 503 });
	return json((data ?? []).map(({ id, display_name }) => ({ id, name: display_name })));
};

export const POST: RequestHandler = async ({ locals, request, url }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Accès refusé.' }, { status: 403 });

	const body = (await request.json().catch(() => null)) as {
		name?: unknown;
		email?: unknown;
	} | null;
	const name = typeof body?.name === 'string' ? body.name.trim() : '';
	const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
	if (
		name.length < 1 ||
		name.length > 100 ||
		email.length > 320 ||
		!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	) {
		return json({ error: 'Saisissez un nom et une adresse e-mail valides.' }, { status: 400 });
	}

	try {
		const supabase = createSupabaseAdminClient();
		const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
			data: { display_name: name },
			redirectTo: new URL('/auth/callback?next=/compte/mot-de-passe', url).toString()
		});
		if (error) {
			const alreadyExists =
				error.code === 'user_already_exists' ||
				error.message.toLowerCase().includes('already registered');
			return json(
				{
					error: alreadyExists
						? 'Un compte existe déjà pour cette adresse.'
						: 'Invitation impossible.'
				},
				{ status: alreadyExists ? 409 : 502 }
			);
		}
		return json({ invited: true, userId: data.user.id });
	} catch (error) {
		console.error('Supabase account invitation failed.', error);
		return json({ error: 'Invitation temporairement indisponible.' }, { status: 503 });
	}
};
