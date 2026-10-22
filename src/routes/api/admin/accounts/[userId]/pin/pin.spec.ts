import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAppsScript } from '#lib/server/appsScript';
import type { UserSession } from '#lib/server/session';
import { PUT } from './+server';

vi.mock('#lib/server/appsScript', () => ({ callAppsScript: vi.fn() }));

const scriptCall = vi.mocked(callAppsScript);
const student: UserSession = {
	userId: 'ali',
	name: 'Ali',
	role: 'student',
	expiresAt: Date.now() + 60_000
};
const admin: UserSession = {
	userId: 'prof',
	name: 'Prof',
	role: 'admin',
	expiresAt: Date.now() + 60_000
};

type PinEvent = Parameters<typeof PUT>[0];

function makeEvent(user: UserSession, targetUserId: string, pin: string): PinEvent {
	return {
		locals: { user },
		params: { userId: targetUserId },
		request: new Request(`https://example.test/api/admin/accounts/${targetUserId}/pin`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ pin })
		})
	} as PinEvent;
}

describe('/api/admin/accounts/:userId/pin', () => {
	beforeEach(() => {
		scriptCall.mockReset();
	});

	it('rejects PIN changes requested by a student', async () => {
		const response = await PUT(makeEvent(student, 'olga', '123456'));

		expect(response.status).toBe(403);
		expect(scriptCall).not.toHaveBeenCalled();
	});

	it('lets Prof set a PIN only for a fixed account', async () => {
		scriptCall.mockResolvedValue({ reset: true });
		const response = await PUT(makeEvent(admin, 'olga', '246810'));

		expect(response.status).toBe(200);
		expect(scriptCall).toHaveBeenCalledWith({
			action: 'resetPin',
			actorUserId: 'prof',
			targetUserId: 'olga',
			newPin: '246810'
		});
	});

	it('rejects a short PIN before calling Apps Script', async () => {
		const response = await PUT(makeEvent(admin, 'olga', '123'));

		expect(response.status).toBe(400);
		expect(scriptCall).not.toHaveBeenCalled();
	});
});
