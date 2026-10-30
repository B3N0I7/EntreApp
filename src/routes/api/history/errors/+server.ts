import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Erreur, ModuleType } from '#lib/sheetService';

const modules = new Set<ModuleType>([
	'vocabulaire-definition',
	'vocabulaire-mot',
	'expressions-word-to-definition',
	'expressions-definition-to-word',
	'conjugaison'
]);

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}

	const module = url.searchParams.get('module');
	const limit = Number(url.searchParams.get('limit') ?? 10);
	if (!module || !modules.has(module as ModuleType)) {
		return json({ error: 'Activité invalide.' }, { status: 400 });
	}
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		return json(
			{ error: 'Le nombre d’erreurs doit être compris entre 1 et 100.' },
			{ status: 400 }
		);
	}

	const { data, error } = await locals.supabase
		.from('answer_attempts')
		.select('details')
		.eq('user_id', locals.user.userId)
		.eq('module', module)
		.eq('is_correct', false)
		.not('details', 'is', null)
		.order('created_at', { ascending: false })
		.limit(limit);
	if (error) {
		console.error('Supabase recent error lookup failed.', error);
		return json(
			{ error: 'Les erreurs récentes sont temporairement indisponibles.' },
			{ status: 502 }
		);
	}

	return json({
		module,
		erreurs: (data ?? []).map((attempt) => attempt.details as unknown as Erreur)
	});
};
