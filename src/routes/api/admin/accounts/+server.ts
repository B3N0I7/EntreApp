import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ACCOUNTS } from '#lib/accounts';

export const GET: RequestHandler = ({ locals }) => {
	if (locals.user?.role !== 'admin') return json({ error: 'Accès refusé.' }, { status: 403 });
	return json(ACCOUNTS);
};
