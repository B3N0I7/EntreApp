import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSession } from '#lib/server/session';
import { createSupabaseAdminClient } from '#lib/server/supabase';
import { POST } from './+server';

vi.mock('#lib/server/supabase', () => ({ createSupabaseAdminClient: vi.fn() }));

const createAdminClient = vi.mocked(createSupabaseAdminClient);
const admin: UserSession = { userId: 'prof-id', name: 'Prof', role: 'admin' };
const student: UserSession = { userId: 'student-id', name: 'Élève', role: 'student' };
type InviteEvent = Parameters<typeof POST>[0];

function makeEvent(user: UserSession | null, body: unknown): InviteEvent {
	return {
		locals: { user },
		url: new URL('https://example.test/api/admin/accounts'),
		request: new Request('https://example.test/api/admin/accounts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	} as InviteEvent;
}

describe('/api/admin/accounts', () => {
	beforeEach(() => createAdminClient.mockReset());

	it('allows only admins to invite accounts', async () => {
		const response = await POST(makeEvent(student, { name: 'Olga', email: 'olga@example.test' }));

		expect(response.status).toBe(403);
		expect(createAdminClient).not.toHaveBeenCalled();
	});

	it('invites a student with a display name and password setup redirect', async () => {
		const inviteUserByEmail = vi
			.fn()
			.mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null });
		createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail } } } as never);

		const response = await POST(
			makeEvent(admin, { name: '  Olga  ', email: '  Olga@example.test ' })
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ invited: true, userId: 'new-id' });
		expect(inviteUserByEmail).toHaveBeenCalledWith('olga@example.test', {
			data: { display_name: 'Olga' },
			redirectTo: 'https://example.test/auth/callback?next=/compte/mot-de-passe'
		});
	});

	it('rejects invalid addresses before creating an admin client', async () => {
		const response = await POST(makeEvent(admin, { name: 'Olga', email: 'invalid' }));

		expect(response.status).toBe(400);
		expect(createAdminClient).not.toHaveBeenCalled();
	});
});
