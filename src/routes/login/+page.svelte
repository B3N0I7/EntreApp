<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ACCOUNTS } from '#lib/accounts';

	let userId = $state(ACCOUNTS[0]?.id ?? '');
	let pin = $state('');
	let error = $state('');
	let busy = $state(false);

	async function login(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		busy = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ userId, pin })
			});
			if (!response.ok) {
				const result = (await response.json().catch(() => null)) as { error?: string } | null;
				throw new Error(result?.error ?? 'Connexion impossible.');
			}
			await goto(resolve('/'), { invalidateAll: true });
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Connexion impossible.';
		} finally {
			busy = false;
		}
	}

	async function continueAsGuest() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			const response = await fetch('/api/auth/guest', { method: 'POST' });
			if (!response.ok) throw new Error('Mode invité indisponible.');
			await goto(resolve('/'), { invalidateAll: true });
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Mode invité indisponible.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Connexion · Objectif B1</title>
	<meta name="description" content="Connexion aux exercices Objectif B1." />
</svelte:head>

<main class="login-page">
	<section class="login-panel" aria-labelledby="login-title">
		<p class="eyebrow">Objectif B1 · Espace de travail</p>
		<h1 id="login-title">Connexion</h1>
		<form onsubmit={login}>
			<label for="account">Nom</label>
			<select id="account" bind:value={userId} required>
				{#each ACCOUNTS as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>

			<label for="pin">Code PIN</label>
			<input
				id="pin"
				bind:value={pin}
				type="password"
				inputmode="numeric"
				pattern={'[0-9]{6,12}'}
				minlength="6"
				maxlength="12"
				autocomplete="current-password"
				required
			/>

			{#if error}<p class="form-error" role="alert">{error}</p>{/if}
			<button class="primary-action" type="submit" disabled={busy}>
				{busy ? 'Connexion…' : 'Se connecter'}
			</button>
		</form>
		<div class="guest-action">
			<span>Tester sans enregistrer</span>
			<button type="button" onclick={continueAsGuest} disabled={busy}>Continuer comme invité</button
			>
		</div>
	</section>
</main>

<style>
	.login-page {
		min-height: calc(100vh - 5.25rem);
		display: grid;
		place-items: center;
		padding: 3rem 1.25rem;
		background-image: linear-gradient(115deg, rgb(255 255 255 / 0.38), transparent 55%);
	}

	.login-panel {
		width: min(100%, 28rem);
		padding: clamp(1.5rem, 5vw, 2.5rem);
		border-top: 4px solid #f15d43;
		background: #f7f8f2;
		box-shadow: 0 1rem 3rem rgb(24 44 37 / 0.08);
	}

	.eyebrow {
		margin: 0 0 0.65rem;
		color: #60756a;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1 {
		margin: 0 0 2rem;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 2.6rem;
		font-weight: 500;
	}

	form {
		display: grid;
		gap: 0.65rem;
	}

	label {
		margin-top: 0.65rem;
		color: #52665b;
		font-size: 0.78rem;
		font-weight: 800;
	}

	select,
	input {
		width: 100%;
		min-height: 3rem;
		padding: 0 0.8rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #fff;
		color: #182c25;
	}

	.primary-action {
		min-height: 3rem;
		margin-top: 0.85rem;
		border: 0;
		background: #173b30;
		color: #fffaf0;
		font-weight: 800;
		cursor: pointer;
	}

	.primary-action:disabled,
	.guest-action button:disabled {
		cursor: wait;
		opacity: 0.65;
	}

	.form-error {
		margin: 0.4rem 0 0;
		color: #b23e2d;
		font-size: 0.86rem;
	}

	.guest-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-top: 1.5rem;
		padding-top: 1rem;
		border-top: 1px solid #dce4dc;
		color: #60756a;
		font-size: 0.78rem;
	}

	.guest-action button {
		padding: 0.5rem 0;
		border: 0;
		background: transparent;
		color: #173b30;
		font-weight: 800;
		text-decoration: underline;
		text-underline-offset: 0.2rem;
		cursor: pointer;
	}

	:global(button:focus-visible),
	:global(input:focus-visible),
	:global(select:focus-visible) {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}

	@media (max-width: 760px) {
		.login-page {
			min-height: calc(100vh - 4.75rem);
		}

		.guest-action {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
