import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './+server';

type LoginEvent = Parameters<typeof POST>[0];

function makeEvent(body: unknown, profile?: { id: string; display_name: string; role: string }) {
	const maybeSingle = vi.fn().mockResolvedValue({ data: profile ?? null, error: null });
	const eq = vi.fn().mockReturnValue({ maybeSingle });
	const select = vi.fn().mockReturnValue({ eq });
	const signInWithPassword = vi.fn().mockResolvedValue({
		data: { user: { id: 'user-123' } },
		error: null
	});
	const signOut = vi.fn();
	const supabase = {
		auth: { signInWithPassword, signOut },
		from: vi.fn().mockReturnValue({ select })
	};
	const event = {
		request: new Request('https://example.test/api/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}),
		locals: { supabase }
	} as unknown as LoginEvent;
	return { event, supabase };
}

describe('/api/auth/login', () => {
	beforeEach(() => {});

	it('signs in with Supabase and returns the account profile', async () => {
		const { event, supabase } = makeEvent(
			{ email: 'prof@example.test', password: 'strong-password' },
			{ id: 'user-123', display_name: 'Prof', role: 'admin' }
		);

		const response = await POST(event);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			user: { userId: 'user-123', name: 'Prof', role: 'admin' }
		});
		expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
			email: 'prof@example.test',
			password: 'strong-password'
		});
	});

	it('does not return a session for an invalid password', async () => {
		const { event, supabase } = makeEvent({
			email: 'ali@example.test',
			password: 'wrong-password'
		});
		vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
			data: { user: null },
			error: { name: 'AuthError', message: 'invalid' } as never
		});

		const response = await POST(event);
		expect(response.status).toBe(401);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('rejects malformed emails before signing in', async () => {
		const { event, supabase } = makeEvent({ email: 'not-an-email', password: 'anything' });

		const response = await POST(event);
		expect(response.status).toBe(400);
		expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
	});

	it('rejects an account without a profile and clears its Supabase session', async () => {
		const { event, supabase } = makeEvent({ email: 'new@example.test', password: 'password' });

		const response = await POST(event);
		expect(response.status).toBe(403);
		expect(supabase.auth.signOut).toHaveBeenCalledOnce();
	});
});
