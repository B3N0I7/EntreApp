import { describe, expect, it, vi } from 'vitest';
import type { UserSession } from '#lib/server/session';
import { GET, PUT } from './+server';

type PreferencesEvent = Parameters<typeof GET>[0];
const student: UserSession = { userId: 'student-id', name: 'Élève', role: 'student' };
const guest: UserSession = { userId: 'guest', name: 'Invité', role: 'guest' };

function makeEvent(
	user: UserSession | null,
	method: 'GET' | 'PUT',
	body?: unknown,
	activity = 'vocabulary'
) {
	const query = {
		select: vi.fn(() => query),
		eq: vi.fn(() => query),
		maybeSingle: vi
			.fn()
			.mockResolvedValue({ data: { settings: { answerMode: 'multiple-choice' } }, error: null }),
		upsert: vi.fn().mockResolvedValue({ error: null })
	};
	const supabase = { from: vi.fn(() => query) };
	const url = `https://example.test/api/preferences?activity=${activity}`;
	const event = {
		locals: { user, supabase },
		url: new URL(url),
		request: new Request(url, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	} as unknown as PreferencesEvent;
	return { event, query };
}

describe('/api/preferences', () => {
	it('returns preferences for the authenticated account', async () => {
		const { event, query } = makeEvent(student, 'GET');

		const response = await GET(event);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ answerMode: 'multiple-choice' });
		expect(query.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-id');
	});

	it('does not store preferences for guests', async () => {
		const { event, query } = makeEvent(guest, 'PUT', {
			activity: 'vocabulary',
			settings: { answerMode: 'multiple-choice' }
		});

		const response = await PUT(event);

		expect(response.status).toBe(401);
		expect(query.upsert).not.toHaveBeenCalled();
	});

	it('stores valid settings with the owner derived from the session', async () => {
		const { event, query } = makeEvent(student, 'PUT', {
			activity: 'expressions',
			settings: { answerMode: 'self-assessment', direction: 'definition-to-word' }
		});

		const response = await PUT(event);

		expect(response.status).toBe(200);
		expect(query.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				user_id: 'student-id',
				activity: 'expressions',
				settings: { answerMode: 'self-assessment', direction: 'definition-to-word' }
			}),
			{ onConflict: 'user_id,activity' }
		);
	});

	it('stores valid conjugation selections', async () => {
		const settings = { verbChoice: 'etre', tenseChoice: 'present' };
		const { event, query } = makeEvent(
			student,
			'PUT',
			{ activity: 'conjugation', settings },
			'conjugation'
		);

		const response = await PUT(event);

		expect(response.status).toBe(200);
		expect(query.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ activity: 'conjugation', settings }),
			{ onConflict: 'user_id,activity' }
		);
	});

	it('rejects conjugation IDs outside the catalogs', async () => {
		const { event, query } = makeEvent(
			student,
			'PUT',
			{ activity: 'conjugation', settings: { verbChoice: 'not-a-verb' } },
			'conjugation'
		);

		const response = await PUT(event);

		expect(response.status).toBe(400);
		expect(query.upsert).not.toHaveBeenCalled();
	});

	it('rejects unknown preference fields', async () => {
		const { event, query } = makeEvent(student, 'PUT', {
			activity: 'vocabulary',
			settings: { answerMode: 'surprise' }
		});

		const response = await PUT(event);

		expect(response.status).toBe(400);
		expect(query.upsert).not.toHaveBeenCalled();
	});
});
