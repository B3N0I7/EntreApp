import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppsScriptError, callAppsScript } from '#lib/server/appsScript';
import { verifySessionToken, SESSION_COOKIE } from '#lib/server/session';
import { POST } from './+server';

vi.mock('#lib/server/appsScript', async (importOriginal) => {
	const actual = await importOriginal<typeof import('#lib/server/appsScript')>();
	return { ...actual, callAppsScript: vi.fn() };
});

const scriptCall = vi.mocked(callAppsScript);
const secret = 'session-secret-for-login-tests-with-32-bytes';
type LoginEvent = Parameters<typeof POST>[0];

function makeEvent(body: unknown, secure = true) {
	const setCookie = vi.fn();
	const event = {
		request: new Request('https://example.test/api/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}),
		cookies: { set: setCookie },
		url: new URL(`${secure ? 'https' : 'http'}://example.test/api/auth/login`)
	} as unknown as LoginEvent;
	return { event, setCookie };
}

describe('/api/auth/login', () => {
	beforeEach(() => {
		scriptCall.mockReset();
		vi.stubEnv('SESSION_SECRET', secret);
	});

	it('creates a signed, HttpOnly session from the fixed account roster', async () => {
		scriptCall.mockResolvedValue({ authenticated: true });
		const { event, setCookie } = makeEvent({ userId: 'prof', pin: '123456' });

		const response = await POST(event);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			user: { userId: 'prof', name: 'Prof', role: 'admin' }
		});
		const [cookieName, token, options] = setCookie.mock.calls[0] ?? [];
		expect(cookieName).toBe(SESSION_COOKIE);
		expect(options).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax' });
		expect(verifySessionToken(String(token), secret)).toMatchObject({
			userId: 'prof',
			role: 'admin'
		});
		expect(scriptCall).toHaveBeenCalledWith({ action: 'login', userId: 'prof', pin: '123456' });
	});

	it('does not create a session for an invalid PIN', async () => {
		scriptCall.mockRejectedValue(
			new AppsScriptError('INVALID_CREDENTIALS', 'Invalid credentials.')
		);
		const { event, setCookie } = makeEvent({ userId: 'ali', pin: '123456' });

		const response = await POST(event);
		expect(response.status).toBe(401);
		expect(setCookie).not.toHaveBeenCalled();
	});

	it('rejects malformed PINs before calling Apps Script', async () => {
		const { event } = makeEvent({ userId: 'ali', pin: '123' });

		const response = await POST(event);
		expect(response.status).toBe(400);
		expect(scriptCall).not.toHaveBeenCalled();
	});
});
