import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { callAppsScript } from './appsScript';

const secret = 'apps-script-secret-that-is-at-least-32-bytes';

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
});

describe('Apps Script relay', () => {
	it('signs the exact payload sent by the server', async () => {
		vi.stubEnv('APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec');
		vi.stubEnv('APPS_SCRIPT_SHARED_SECRET', secret);
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ status: 'success', data: { authenticated: true } }), {
				headers: { 'content-type': 'application/json' }
			})
		);
		const payload = { action: 'login', userId: 'ali', pin: '123456' };

		await expect(callAppsScript(payload)).resolves.toEqual({ authenticated: true });
		const request = fetchSpy.mock.calls[0]?.[1];
		const envelope = JSON.parse(String(request?.body)) as {
			timestamp: string;
			payloadJson: string;
			signature: string;
		};
		expect(request?.method).toBe('POST');
		expect(JSON.parse(envelope.payloadJson)).toEqual(payload);
		expect(envelope.signature).toBe(
			createHmac('sha256', secret)
				.update(`${envelope.timestamp}.${envelope.payloadJson}`)
				.digest('hex')
		);
	});

	it('preserves Apps Script error codes for authentication handling', async () => {
		vi.stubEnv('APPS_SCRIPT_URL', 'https://script.google.com/macros/s/test/exec');
		vi.stubEnv('APPS_SCRIPT_SHARED_SECRET', secret);
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					status: 'error',
					code: 'INVALID_CREDENTIALS',
					message: 'Invalid credentials.'
				}),
				{ headers: { 'content-type': 'application/json' } }
			)
		);

		await expect(callAppsScript({ action: 'login' })).rejects.toMatchObject({
			code: 'INVALID_CREDENTIALS'
		});
	});
});
