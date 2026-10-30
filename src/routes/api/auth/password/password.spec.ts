import { describe, expect, it, vi } from 'vitest';
import type { UserSession } from '#lib/server/session';
import { PUT } from './+server';

type PasswordEvent = Parameters<typeof PUT>[0];
const student: UserSession = { userId: 'student-id', name: 'Élève', role: 'student' };
const guest: UserSession = { userId: 'guest', name: 'Invité', role: 'guest' };

function makeEvent(user: UserSession | null, password: unknown) {
	const updateUser = vi.fn().mockResolvedValue({ error: null });
	const event = {
		locals: { user, supabase: { auth: { updateUser } } },
		request: new Request('https://example.test/api/auth/password', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ password })
		})
	} as unknown as PasswordEvent;
	return { event, updateUser };
}

describe('/api/auth/password', () => {
	it('updates an authenticated user password', async () => {
		const { event, updateUser } = makeEvent(student, 'a-long-enough-password');

		const response = await PUT(event);

		expect(response.status).toBe(200);
		expect(updateUser).toHaveBeenCalledWith({ password: 'a-long-enough-password' });
	});

	it('does not let a guest update a password', async () => {
		const { event, updateUser } = makeEvent(guest, 'a-long-enough-password');

		const response = await PUT(event);

		expect(response.status).toBe(401);
		expect(updateUser).not.toHaveBeenCalled();
	});

	it('rejects passwords shorter than twelve characters', async () => {
		const { event, updateUser } = makeEvent(student, 'short');

		const response = await PUT(event);

		expect(response.status).toBe(400);
		expect(updateUser).not.toHaveBeenCalled();
	});
});
