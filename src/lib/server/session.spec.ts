import { describe, expect, it } from 'vitest';
import { createSessionToken, verifySessionToken, type UserSession } from './session';

const secret = 'test-session-secret-that-is-at-least-32-bytes';
const session: UserSession = {
	userId: 'prof',
	name: 'Prof',
	role: 'admin',
	expiresAt: 10_000
};

describe('session tokens', () => {
	it('accepts a valid, unexpired signed session', () => {
		const token = createSessionToken(session, secret);

		expect(verifySessionToken(token, secret, 9_999)).toEqual(session);
	});

	it('rejects modified, expired, and wrongly signed sessions', () => {
		const token = createSessionToken(session, secret);

		expect(verifySessionToken(`${token}x`, secret, 1)).toBeNull();
		expect(verifySessionToken(token, 'wrong-secret', 1)).toBeNull();
		expect(verifySessionToken(token, secret, 10_000)).toBeNull();
	});

	it('rejects claims that do not match the fixed account roster', () => {
		const forged = createSessionToken({ ...session, role: 'student' }, secret);

		expect(verifySessionToken(forged, secret, 1)).toBeNull();
	});
});
