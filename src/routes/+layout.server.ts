import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		user: locals.user
			? { userId: locals.user.userId, name: locals.user.name, role: locals.user.role }
			: null
	};
};
