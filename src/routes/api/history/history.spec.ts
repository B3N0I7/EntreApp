import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './+server';
import type { UserSession } from '#lib/server/session';

const student: UserSession = {
	userId: 'ali',
	name: 'Ali',
	role: 'student'
};
const guest: UserSession = {
	userId: 'guest',
	name: 'Invité',
	role: 'guest'
};
const admin: UserSession = {
	userId: 'prof',
	name: 'Prof',
	role: 'admin'
};

type HistoryEvent = Parameters<typeof GET>[0];

function makeSupabase(rows: unknown[] = []) {
	const historyQuery = {
		select: vi.fn(() => historyQuery),
		order: vi.fn(() => historyQuery),
		limit: vi.fn(() => historyQuery),
		eq: vi.fn(() => historyQuery),
		then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
			Promise.resolve({ data: rows, error: null }).then(resolve)
	};
	const rpcCalls: { name: string; args: unknown }[] = [];
	const supabase = {
		from: vi.fn(() => ({
			select: () => historyQuery,
			upsert: vi.fn()
		})),
		rpc: async (name: string, args: unknown) => {
			rpcCalls.push({ name, args });
			return { error: null };
		}
	};
	return { supabase, historyQuery, rpcCalls };
}

function makeEvent(
	user: UserSession | null,
	path = '/api/history',
	method = 'GET',
	body?: unknown,
	supabase: ReturnType<typeof makeSupabase>['supabase'] | null = makeSupabase().supabase
): HistoryEvent {
	return {
		locals: { user, supabase },
		url: new URL(path, 'https://example.test'),
		request: new Request(`https://example.test${path}`, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	} as HistoryEvent;
}

describe('/api/history authorization', () => {
	beforeEach(() => vi.restoreAllMocks());

	it('does not persist guest sessions', async () => {
		const response = await POST(
			makeEvent(guest, '/api/history', 'POST', {
				module: 'conjugaison',
				score: '0/1',
				erreurs: []
			})
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ saved: false });
	});

	it('prevents students from requesting another account history', async () => {
		const response = await GET(makeEvent(student, '/api/history?userId=olga'));

		expect(response.status).toBe(403);
	});

	it('derives the saved userId from the signed session, not the request body', async () => {
		const { supabase, rpcCalls } = makeSupabase();
		const response = await POST(
			makeEvent(
				student,
				'/api/history',
				'POST',
				{
					sessionId: '00000000-0000-4000-8000-000000000001',
					userId: 'olga',
					module: 'conjugaison',
					score: '0/1',
					erreurs: [],
					tentatives: []
				},
				supabase
			)
		);

		expect(response.status).toBe(200);
		expect(rpcCalls).toEqual([
			{
				name: 'record_activity_session',
				args: {
					p_session_id: '00000000-0000-4000-8000-000000000001',
					p_module: 'conjugaison',
					p_score: '0/1',
					p_attempts: []
				}
			}
		]);
	});

	it('accepts expression activity modules', async () => {
		const { supabase, rpcCalls } = makeSupabase();
		const response = await POST(
			makeEvent(
				student,
				'/api/history',
				'POST',
				{
					sessionId: '00000000-0000-4000-8000-000000000002',
					module: 'expressions-word-to-definition',
					score: '4/5',
					erreurs: [],
					tentatives: []
				},
				supabase
			)
		);

		expect(response.status).toBe(200);
		expect(rpcCalls[0]?.args).toMatchObject({ p_module: 'expressions-word-to-definition' });
	});

	it('rejects malformed attempts before calling the database', async () => {
		const { supabase, rpcCalls } = makeSupabase();
		const response = await POST(
			makeEvent(
				student,
				'/api/history',
				'POST',
				{
					sessionId: '00000000-0000-4000-8000-000000000004',
					module: 'conjugaison',
					score: '0/1',
					erreurs: [],
					tentatives: [{}]
				},
				supabase
			)
		);

		expect(response.status).toBe(400);
		expect(rpcCalls).toEqual([]);
	});

	it('allows Prof to request the complete history', async () => {
		const { supabase, historyQuery } = makeSupabase();
		const response = await GET(makeEvent(admin, '/api/history', 'GET', undefined, supabase));

		expect(response.status).toBe(200);
		expect(historyQuery.eq).not.toHaveBeenCalled();
	});

	it('maps recent incorrect attempts from Supabase into history errors', async () => {
		const error = {
			entryId: 'family-1',
			direction: 'word-to-definition',
			mode: 'multiple-choice',
			mot: 'la soeur',
			reponseEleve: 'the brother',
			correction: 'the sister'
		};
		const { supabase } = makeSupabase([
			{
				id: '00000000-0000-4000-8000-000000000003',
				user_id: 'ali',
				module: 'vocabulaire-mot',
				score: '0/1',
				created_at: '2026-10-30T12:00:00.000Z',
				answer_attempts: [{ details: error, is_correct: false }]
			}
		]);
		const response = await GET(makeEvent(student, '/api/history', 'GET', undefined, supabase));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{
				id: '00000000-0000-4000-8000-000000000003',
				date: '2026-10-30T12:00:00.000Z',
				userId: 'ali',
				module: 'vocabulaire-mot',
				score: '0/1',
				erreurs: [error]
			}
		]);
	});
});
