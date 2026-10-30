import { describe, expect, it, vi } from 'vitest';
import type { UserSession } from '#lib/server/session';
import { GET } from './+server';

type ErrorsEvent = Parameters<typeof GET>[0];
const student: UserSession = { userId: 'student-id', name: 'Élève', role: 'student' };
const guest: UserSession = { userId: 'guest', name: 'Invité', role: 'guest' };

function makeEvent(user: UserSession | null, search = '?module=vocabulaire-mot&limit=5') {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		not: vi.fn(() => query),
		order: vi.fn(() => query),
		limit: vi.fn(() => query),
		then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
			Promise.resolve({
				data: [
					{
						details: {
							entryId: 'family-1',
							direction: 'word-to-definition',
							mode: 'multiple-choice',
							mot: 'la soeur',
							reponseEleve: 'the brother',
							correction: 'the sister'
						}
					}
				],
				error: null
			}).then(resolve)
	};
	const supabase = { from: vi.fn(() => query) };
	return {
		event: {
			locals: { user, supabase },
			url: new URL(`https://example.test/api/history/errors${search}`)
		} as unknown as ErrorsEvent,
		supabase,
		query
	};
}

describe('/api/history/errors', () => {
	it('requires an authenticated learner', async () => {
		const { event, supabase } = makeEvent(guest);

		const response = await GET(event);

		expect(response.status).toBe(401);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('validates activity and count limits', async () => {
		const badModule = await GET(makeEvent(student, '?module=unknown&limit=5').event);
		const badCount = await GET(makeEvent(student, '?module=conjugaison&limit=101').event);

		expect(badModule.status).toBe(400);
		expect(badCount.status).toBe(400);
	});

	it('returns the requested number of recent errors for the current user only', async () => {
		const { event, supabase, query } = makeEvent(student);

		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			module: 'vocabulaire-mot',
			erreurs: [{ entryId: 'family-1' }]
		});
		expect(supabase.from).toHaveBeenCalledWith('answer_attempts');
		expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-id');
		expect(query.eq).toHaveBeenNthCalledWith(2, 'module', 'vocabulaire-mot');
		expect(query.eq).toHaveBeenNthCalledWith(3, 'is_correct', false);
		expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
		expect(query.limit).toHaveBeenCalledWith(5);
	});
});
