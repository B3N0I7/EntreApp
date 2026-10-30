import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPrivateEnv } from '#lib/server/environment';

type SupportedOtpType = 'email' | 'email_change' | 'invite' | 'magiclink' | 'recovery' | 'signup';

const otpTypes = new Set<SupportedOtpType>([
	'email',
	'email_change',
	'invite',
	'magiclink',
	'recovery',
	'signup'
]);

export const load: PageServerLoad = async ({ locals, url }) => {
	const supabase = locals.supabase;
	if (!supabase) redirect(303, '/login?auth=failed');

	const next =
		url.searchParams.get('next') === '/compte/mot-de-passe' ? '/compte/mot-de-passe' : '/';
	const code = url.searchParams.get('code');
	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) redirect(303, '/login?auth=failed');
		redirect(303, next);
	}

	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');
	if (tokenHash) {
		if (!type || !otpTypes.has(type as SupportedOtpType)) redirect(303, '/login?auth=failed');
		const { error } = await supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type: type as SupportedOtpType
		});
		if (error) redirect(303, '/login?auth=failed');
		redirect(303, next);
	}

	const supabaseUrl = getPrivateEnv('SUPABASE_URL');
	const anonKey = getPrivateEnv('SUPABASE_ANON_KEY');
	if (!supabaseUrl || !anonKey) redirect(303, '/login?auth=failed');
	return { supabaseUrl, anonKey, next };
};
