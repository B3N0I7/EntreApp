import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAppsScript } from '#lib/server/appsScript';
import { GET, POST } from './+server';
import type { UserSession } from '#lib/server/session';

vi.mock('#lib/server/appsScript', () => ({ callAppsScript: vi.fn() }));

const scriptCall = vi.mocked(callAppsScript);
const student: UserSession = {
	userId: 'ali',
	name: 'Ali',
	role: 'student',
	expiresAt: Date.now() + 60_000
};
const guest: UserSession = {
	userId: 'guest',
	name: 'Invité',
	role: 'guest',
	expiresAt: Date.now() + 60_000
};
const admin: UserSession = {
	userId: 'prof',
	name: 'Prof',
	role: 'admin',
	expiresAt: Date.now() + 60_000
};

type HistoryEvent = Parameters<typeof GET>[0];

function makeEvent(
	user: UserSession | null,
	path = '/api/history',
	method = 'GET',
	body?: unknown
): HistoryEvent {
	return {
		locals: { user },
		url: new URL(path, 'https://example.test'),
		request: new Request(`https://example.test${path}`, {
			method,
			headers: body === undefined ? undefined : { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		})
	} as HistoryEvent;
}

describe('/api/history authorization', () => {
	beforeEach(() => {
		scriptCall.mockReset();
	});

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
		expect(scriptCall).not.toHaveBeenCalled();
	});

	it('prevents students from requesting another account history', async () => {
		const response = await GET(makeEvent(student, '/api/history?userId=olga'));

		expect(response.status).toBe(403);
		expect(scriptCall).not.toHaveBeenCalled();
	});

	it('derives the saved userId from the signed session, not the request body', async () => {
		scriptCall.mockResolvedValue({ saved: true });
		const response = await POST(
			makeEvent(student, '/api/history', 'POST', {
				userId: 'olga',
				module: 'conjugaison',
				score: '0/1',
				erreurs: []
			})
		);

		expect(response.status).toBe(200);
		expect(scriptCall).toHaveBeenCalledWith({
			action: 'savePartie',
			actorUserId: 'ali',
			partie: { userId: 'olga', module: 'conjugaison', score: '0/1', erreurs: [] }
		});
	});

	it('allows Prof to request the complete history', async () => {
		scriptCall.mockResolvedValue([]);
		const response = await GET(makeEvent(admin));

		expect(response.status).toBe(200);
		expect(scriptCall).toHaveBeenCalledWith({
			action: 'history',
			actorUserId: 'prof',
			targetUserId: null
		});
	});
});
