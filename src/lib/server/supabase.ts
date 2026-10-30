import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Cookies } from '@sveltejs/kit';
import { getPrivateEnv } from './environment';

function getSupabaseUrl(): string | undefined {
	return getPrivateEnv('SUPABASE_URL');
}

function getAnonKey(): string | undefined {
	return getPrivateEnv('SUPABASE_ANON_KEY');
}

export function createSupabaseServerClient(cookies: Cookies): SupabaseClient | null {
	const url = getSupabaseUrl();
	const anonKey = getAnonKey();
	if (!url || !anonKey) return null;

	return createServerClient(url, anonKey, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (values) => {
				for (const { name, value, options } of values) {
					cookies.set(name, value, options);
				}
			}
		}
	});
}

export function createSupabaseAdminClient(): SupabaseClient {
	const url = getSupabaseUrl();
	const serviceRoleKey = getPrivateEnv('SUPABASE_SERVICE_ROLE_KEY');
	if (!url || !serviceRoleKey) {
		throw new Error('Supabase admin credentials are not configured.');
	}

	return createClient(url, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false }
	});
}
