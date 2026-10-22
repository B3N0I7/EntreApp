import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { ACCOUNTS } from '#lib/accounts';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.user?.role !== 'admin') redirect(303, '/');
	return { accounts: ACCOUNTS };
};
