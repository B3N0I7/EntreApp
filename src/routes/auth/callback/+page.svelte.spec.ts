import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CallbackPage from './+page.svelte';

const mocks = vi.hoisted(() => ({
	goto: vi.fn(),
	setSession: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: mocks.goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('@supabase/ssr', () => ({
	createBrowserClient: vi.fn(() => ({ auth: { setSession: mocks.setSession } }))
}));

afterEach(() => {
	window.history.replaceState({}, '', window.location.pathname + window.location.search);
	vi.clearAllMocks();
});

describe('callback page', () => {
	it('stores invite tokens from the URL fragment and opens password setup', async () => {
		mocks.setSession.mockResolvedValue({ error: null });
		window.location.hash = '#access_token=access-token&refresh_token=refresh-token&type=invite';
		render(CallbackPage, {
			data: {
				user: null,
				supabaseUrl: 'https://project.supabase.co',
				anonKey: 'publishable-key',
				next: '/compte/mot-de-passe'
			}
		});

		await expect
			.poll(() => mocks.setSession)
			.toHaveBeenCalledWith({
				access_token: 'access-token',
				refresh_token: 'refresh-token'
			});
		await expect
			.poll(() => mocks.goto)
			.toHaveBeenCalledWith('/compte/mot-de-passe', {
				invalidateAll: true
			});
	});
});
