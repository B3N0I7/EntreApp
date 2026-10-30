import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TENSES, VERBS } from '#lib/conjugation';

const activities = new Set(['vocabulary', 'expressions', 'conjugation']);

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}
	const activity = url.searchParams.get('activity');
	if (!activity || !activities.has(activity))
		return json({ error: 'Activité invalide.' }, { status: 400 });

	const { data, error } = await locals.supabase
		.from('study_preferences')
		.select('settings')
		.eq('user_id', locals.user.userId)
		.eq('activity', activity)
		.maybeSingle();
	if (error) return json({ error: 'Préférences indisponibles.' }, { status: 502 });
	return json(data?.settings ?? {});
};

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user || locals.user.role === 'guest' || !locals.supabase) {
		return json({ error: 'Connexion requise.' }, { status: 401 });
	}
	const body = (await request.json().catch(() => null)) as {
		activity?: unknown;
		settings?: unknown;
	} | null;
	if (
		typeof body?.activity !== 'string' ||
		!activities.has(body.activity) ||
		!isPreferences(body.settings, body.activity)
	) {
		return json({ error: 'Préférences invalides.' }, { status: 400 });
	}

	const { error } = await locals.supabase.from('study_preferences').upsert(
		{
			user_id: locals.user.userId,
			activity: body.activity,
			settings: body.settings,
			updated_at: new Date().toISOString()
		},
		{ onConflict: 'user_id,activity' }
	);
	if (error) return json({ error: 'Préférences indisponibles.' }, { status: 502 });
	return json({ saved: true });
};

function isPreferences(value: unknown, activity: string): value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const settings = value as Record<string, unknown>;
	if (activity === 'conjugation') {
		return (
			Object.keys(settings).every((key) => key === 'verbChoice' || key === 'tenseChoice') &&
			(settings.verbChoice === undefined ||
				settings.verbChoice === 'random' ||
				(typeof settings.verbChoice === 'string' &&
					VERBS.some((verb) => verb.id === settings.verbChoice))) &&
			(settings.tenseChoice === undefined ||
				settings.tenseChoice === 'random' ||
				(typeof settings.tenseChoice === 'string' &&
					TENSES.some((tense) => tense.id === settings.tenseChoice)))
		);
	}
	return (
		Object.keys(settings).every((key) => key === 'answerMode' || key === 'direction') &&
		(settings.answerMode === undefined ||
			settings.answerMode === 'self-assessment' ||
			settings.answerMode === 'multiple-choice') &&
		(settings.direction === undefined ||
			settings.direction === 'word-to-definition' ||
			settings.direction === 'definition-to-word')
	);
}
