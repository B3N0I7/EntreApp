import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(303, '/');
	if (!locals.supabase) error(503, 'Supabase est indisponible.');
	const { data, error: profileError } = await locals.supabase
		.from('profiles')
		.select('id, display_name')
		.order('display_name');
	if (profileError) error(503, 'Impossible de charger les comptes.');
	return { accounts: (data ?? []).map(({ id, display_name }) => ({ id, name: display_name })) };
};
