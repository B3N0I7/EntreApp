import { describe, expect, it, vi } from 'vitest';
import type { PageServerLoad } from './$types';
import { load } from './+page.server';

type CallbackEvent = Parameters<PageServerLoad>[0];

function makeEvent(search: string) {
	const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
	const verifyOtp = vi.fn().mockResolvedValue({ error: null });
	const event = {
		locals: { supabase: { auth: { exchangeCodeForSession, verifyOtp } } },
		url: new URL(`https://example.test/auth/callback${search}`)
	} as unknown as CallbackEvent;
	return { event, exchangeCodeForSession, verifyOtp };
}

describe('/auth/callback', () => {
	it('exchanges PKCE codes and returns to password setup', async () => {
		const { event, exchangeCodeForSession } = makeEvent(
			'?code=pkce-code&next=%2Fcompte%2Fmot-de-passe'
		);

		await expect(load(event)).rejects.toMatchObject({
			status: 303,
			location: '/compte/mot-de-passe'
		});
		expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
	});

	it('verifies invite token hashes and returns to password setup', async () => {
		const { event, verifyOtp } = makeEvent(
			'?token_hash=invite-token&type=invite&next=%2Fcompte%2Fmot-de-passe'
		);

		await expect(load(event)).rejects.toMatchObject({
			status: 303,
			location: '/compte/mot-de-passe'
		});
		expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'invite-token', type: 'invite' });
	});
});
