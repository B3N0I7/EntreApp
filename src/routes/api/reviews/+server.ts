import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ModuleType } from '#lib/sheetService';

const directions: Record<ModuleType, string> = {
	'vocabulaire-definition': 'definition-to-word',
	'vocabulaire-mot': 'word-to-definition',
	'expressions-word-to-definition': 'word-to-definition',
	'expressions-definition-to-word': 'definition-to-word',
	conjugaison: 'conjugation'
};

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}
	const module = url.searchParams.get('module') as ModuleType | null;
	if (!module || !(module in directions))
		return json({ error: 'Activité invalide.' }, { status: 400 });

	const { data, error } = await locals.supabase
		.from('item_reviews')
		.select('item_id')
		.eq('user_id', locals.user.userId)
		.eq('direction', directions[module])
		.gt('next_review_at', new Date().toISOString())
		.limit(5000);
	if (error) return json({ error: 'État de révision indisponible.' }, { status: 502 });
	return json({ excludedItemIds: (data ?? []).map((review) => review.item_id) });
};
