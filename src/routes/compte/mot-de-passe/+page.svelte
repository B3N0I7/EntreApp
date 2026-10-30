<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let password = $state('');
	let confirmation = $state('');
	let message = $state('');
	let busy = $state(false);
	let hasError = $state(false);

	async function updatePassword(event: SubmitEvent) {
		event.preventDefault();
		if (busy || password.length < 12 || password !== confirmation) return;
		busy = true;
		message = '';
		hasError = false;
		try {
			const response = await fetch('/api/auth/password', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ password })
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) throw new Error(result?.error ?? 'Modification impossible.');
			await goto(resolve('/'), { invalidateAll: true });
		} catch (error) {
			message = error instanceof Error ? error.message : 'Modification impossible.';
			hasError = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Mot de passe · Objectif B1</title>
	<meta name="description" content="Définir un nouveau mot de passe." />
</svelte:head>

<main class="password-page">
	<section class="password-panel" aria-labelledby="password-title">
		<p class="eyebrow">Sécurité du compte</p>
		<h1 id="password-title">Nouveau mot de passe</h1>
		<form onsubmit={updatePassword}>
			<label for="new-password">Mot de passe</label>
			<input
				id="new-password"
				bind:value={password}
				type="password"
				minlength="12"
				maxlength="128"
				autocomplete="new-password"
				required
			/>
			<label for="password-confirmation">Confirmer le mot de passe</label>
			<input
				id="password-confirmation"
				bind:value={confirmation}
				type="password"
				minlength="12"
				maxlength="128"
				autocomplete="new-password"
				required
			/>
			{#if password && confirmation && password !== confirmation}
				<p class="form-error" role="alert">Les mots de passe ne correspondent pas.</p>
			{/if}
			{#if message}
				<p
					class:form-error={hasError}
					class:form-success={!hasError}
					role={hasError ? 'alert' : 'status'}
				>
					{message}
				</p>
			{/if}
			<button type="submit" disabled={busy || password.length < 12 || password !== confirmation}>
				{busy ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
			</button>
		</form>
	</section>
</main>

<style>
	.password-page {
		min-height: calc(100vh - 5.25rem);
		display: grid;
		place-items: center;
		padding: 3rem 1.25rem;
	}

	.password-panel {
		width: min(100%, 32rem);
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
		margin: 0 0 1.5rem;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 2rem;
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

	input {
		min-height: 3rem;
		padding: 0 0.8rem;
		border: 1px solid #bdcbc0;
		background: #fff;
		color: #182c25;
	}

	button {
		min-height: 3rem;
		margin-top: 0.85rem;
		border: 0;
		background: #173b30;
		color: #fffaf0;
		font-weight: 800;
		cursor: pointer;
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.form-error,
	.form-success {
		margin: 0.3rem 0;
		font-size: 0.86rem;
	}

	.form-error {
		color: #b23e2d;
	}

	.form-success {
		color: #365d4d;
	}

	:global(button:focus-visible),
	:global(input:focus-visible) {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}
</style>
