import { describe, expect, it, vi } from 'vitest';
import { POST } from './+server';

type RecoveryEvent = Parameters<typeof POST>[0];

function makeEvent(email: unknown) {
	const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
	const event = {
		locals: { supabase: { auth: { resetPasswordForEmail } } },
		url: new URL('https://example.test/api/auth/recovery'),
		request: new Request('https://example.test/api/auth/recovery', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email })
		})
	} as unknown as RecoveryEvent;
	return { event, resetPasswordForEmail };
}

describe('/api/auth/recovery', () => {
	it('sends a reset link with a fixed callback destination', async () => {
		const { event, resetPasswordForEmail } = makeEvent('learner@example.test');

		const response = await POST(event);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ sent: true });
		expect(resetPasswordForEmail).toHaveBeenCalledWith('learner@example.test', {
			redirectTo: 'https://example.test/auth/callback?next=/compte/mot-de-passe'
		});
	});

	it('rejects malformed addresses', async () => {
		const { event, resetPasswordForEmail } = makeEvent('invalid');

		const response = await POST(event);

		expect(response.status).toBe(400);
		expect(resetPasswordForEmail).not.toHaveBeenCalled();
	});
});
