import { describe, expect, it, vi } from 'vitest';
import type { UserSession } from '#lib/server/session';
import { GET } from './+server';

type ReviewEvent = Parameters<typeof GET>[0];
const student: UserSession = { userId: 'student-id', name: 'Élève', role: 'student' };
const guest: UserSession = { userId: 'guest', name: 'Invité', role: 'guest' };

function makeEvent(user: UserSession | null, module = 'vocabulaire-mot') {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		gt: vi.fn(() => query),
		limit: vi.fn(() => query),
		then: (resolve: (value: { data: Array<{ item_id: string }>; error: null }) => unknown) =>
			Promise.resolve({ data: [{ item_id: 'entry-1' }], error: null }).then(resolve)
	};
	const supabase = { from: vi.fn(() => query) };
	return {
		event: {
			locals: { user, supabase },
			url: new URL(`https://example.test/api/reviews?module=${module}`)
		} as unknown as ReviewEvent,
		supabase,
		query
	};
}

describe('/api/reviews', () => {
	it('requires a non-guest session', async () => {
		const { event, supabase } = makeEvent(guest);

		const response = await GET(event);

		expect(response.status).toBe(401);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('filters future review dates for the current user and question direction', async () => {
		const { event, query } = makeEvent(student, 'expressions-definition-to-word');

		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ excludedItemIds: ['entry-1'] });
		expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-id');
		expect(query.eq).toHaveBeenNthCalledWith(2, 'direction', 'definition-to-word');
		expect(query.gt).toHaveBeenCalledWith('next_review_at', expect.any(String));
	});

	it('rejects unknown modules', async () => {
		const response = await GET(makeEvent(student, 'unknown').event);

		expect(response.status).toBe(400);
	});
});
