<script lang="ts">
	import { createBrowserClient } from '@supabase/ssr';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let message = $state('Validation du lien…');

	onMount(async () => {
		const params = new URLSearchParams(window.location.hash.slice(1));
		const accessToken = params.get('access_token');
		const refreshToken = params.get('refresh_token');
		if (!accessToken || !refreshToken) {
			message = params.get('error_description') ?? 'Ce lien est incomplet ou invalide.';
			return;
		}

		const supabase = createBrowserClient(data.supabaseUrl, data.anonKey);
		const { error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken
		});
		if (error) {
			message = 'Ce lien a expiré ou a déjà été utilisé. Demande un nouvel e-mail.';
			return;
		}

		window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
		const destination =
			data.next === '/compte/mot-de-passe' ? resolve('/compte/mot-de-passe') : resolve('/');
		await goto(destination, { invalidateAll: true });
	});
</script>

<svelte:head>
	<title>Vérification du lien · Objectif B1</title>
</svelte:head>

<main class="callback-page">
	<p role="status" aria-live="polite">{message}</p>
</main>

<style>
	.callback-page {
		min-height: calc(100vh - 5.25rem);
		display: grid;
		place-items: center;
		padding: 2rem;
		color: #173b30;
		font-weight: 700;
	}
</style>
