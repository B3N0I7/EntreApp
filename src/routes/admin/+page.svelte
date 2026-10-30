<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import { chargerHistorique, type Partie } from '#lib/sheetService';

	let { data }: PageProps = $props();
	let selectedUser = $state('all');
	let selectedModule = $state('all');
	let parties = $state<Partie[]>([]);
	let inviteName = $state('');
	let inviteEmail = $state('');
	let loading = $state(true);
	let historyFromCache = $state(false);
	let inviting = $state(false);
	let notice = $state('');
	let noticeIsError = $state(false);

	let filteredParties = $derived(
		selectedModule === 'all'
			? parties
			: parties.filter((partie) => partie.module === selectedModule)
	);

	async function loadHistory() {
		loading = true;
		notice = '';
		try {
			const result = await chargerHistorique(
				selectedUser === 'all' ? undefined : selectedUser,
				page.data.user?.userId
			);
			parties = result.parties;
			historyFromCache = result.fromCache;
		} catch {
			notice = 'Impossible de charger cet historique.';
			noticeIsError = true;
		} finally {
			loading = false;
		}
	}

	onMount(loadHistory);

	async function inviteAccount(event: SubmitEvent) {
		event.preventDefault();
		if (inviting || !inviteName.trim() || !inviteEmail.trim()) return;
		inviting = true;
		notice = '';
		try {
			const response = await fetch('/api/admin/accounts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: inviteName, email: inviteEmail })
			});
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) throw new Error(result?.error ?? 'Invitation impossible.');
			inviteName = '';
			inviteEmail = '';
			notice = 'Invitation envoyée.';
			noticeIsError = false;
			await invalidateAll();
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'Invitation impossible.';
			noticeIsError = true;
		} finally {
			inviting = false;
		}
	}
</script>

<svelte:head>
	<title>Administration · Objectif B1</title>
	<meta name="description" content="Administration des comptes et des historiques." />
</svelte:head>

<main class="admin-page">
	<header class="page-heading">
		<div>
			<p class="eyebrow">Prof · Administration</p>
			<h1>Suivi des parties</h1>
		</div>
	</header>

	<section class="account-section" aria-labelledby="account-title">
		<div>
			<p class="eyebrow">Comptes élèves</p>
			<h2 id="account-title">Inviter un élève</h2>
		</div>
		<form class="invite-form" onsubmit={inviteAccount}>
			<label for="invite-name">Nom</label>
			<input id="invite-name" bind:value={inviteName} maxlength="100" required />
			<label for="invite-email">Adresse e-mail</label>
			<input
				id="invite-email"
				bind:value={inviteEmail}
				type="email"
				autocomplete="email"
				required
			/>
			<button type="submit" disabled={inviting || !inviteName.trim() || !inviteEmail.trim()}>
				{inviting ? 'Envoi…' : 'Envoyer une invitation'}
			</button>
		</form>
	</section>

	<section class="history-section" aria-labelledby="history-title">
		<header class="section-heading">
			<div>
				<p class="eyebrow">Consultation</p>
				<h2 id="history-title">Historique des élèves</h2>
			</div>
			<div class="filters">
				<label for="history-user">Personne</label>
				<select id="history-user" bind:value={selectedUser} onchange={loadHistory}>
					<option value="all">Tout le monde</option>
					{#each data.accounts as account (account.id)}
						<option value={account.id}>{account.name}</option>
					{/each}
				</select>
				<label for="history-module">Module</label>
				<select id="history-module" bind:value={selectedModule}>
					<option value="all">Tous les modules</option>
					<option value="vocabulaire-mot">Trouve la définition</option>
					<option value="vocabulaire-definition">Donne la définition</option>
					<option value="expressions-word-to-definition"
						>Expressions françaises · expression → définition</option
					>
					<option value="expressions-definition-to-word"
						>Expressions françaises · définition → expression</option
					>
					<option value="conjugaison">Conjugaison</option>
				</select>
			</div>
		</header>
		{#if historyFromCache}
			<p class="notice" role="status">Historique en cache; les données peuvent être anciennes.</p>
		{/if}

		{#if loading}
			<p role="status">Chargement…</p>
		{:else if filteredParties.length === 0}
			<p class="empty-state">Aucune partie pour cette sélection.</p>
		{:else}
			<div class="table-wrap">
				<table>
					<thead>
						<tr><th>Date</th><th>Personne</th><th>Module</th><th>Score</th><th>Erreurs</th></tr>
					</thead>
					<tbody>
						{#each filteredParties as partie, index (`${partie.date}-${index}`)}
							<tr>
								<td
									>{new Intl.DateTimeFormat('fr-FR', {
										dateStyle: 'short',
										timeStyle: 'short'
									}).format(new Date(partie.date))}</td
								>
								<td
									>{data.accounts.find((account) => account.id === partie.userId)?.name ??
										partie.userId}</td
								>
								<td>{partie.module}</td>
								<td class="score-cell">{partie.score}</td>
								<td>{partie.erreurs.length}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>

	{#if notice}<p
			class:notice-error={noticeIsError}
			class="notice"
			role={noticeIsError ? 'alert' : 'status'}
		>
			{notice}
		</p>{/if}
</main>

<style>
	.admin-page {
		max-width: 88rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.page-heading,
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.page-heading {
		margin-bottom: 2rem;
	}

	.account-section,
	.history-section {
		padding: 1.4rem 0;
		border-top: 1px solid #ccd7ce;
	}

	.account-section {
		display: grid;
		grid-template-columns: minmax(12rem, 0.7fr) minmax(0, 1.3fr);
		gap: 2rem;
	}

	.history-section {
		margin-top: 1rem;
	}

	.eyebrow {
		margin: 0 0 0.45rem;
		color: #60756a;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1,
	h2 {
		margin: 0;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-weight: 500;
	}

	h1 {
		font-size: 3.5rem;
	}

	h2 {
		font-size: 1.7rem;
	}

	.invite-form,
	.filters {
		display: grid;
		grid-template-columns: auto minmax(8rem, 1fr) auto minmax(8rem, 1fr) auto;
		align-items: end;
		gap: 0.75rem;
	}

	label {
		color: #60756a;
		font-size: 0.74rem;
		font-weight: 800;
	}

	select,
	input {
		min-height: 2.8rem;
		padding: 0 0.7rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #fff;
		color: #182c25;
		font: inherit;
	}

	.invite-form button {
		min-height: 2.8rem;
		padding: 0 0.9rem;
		border: 0;
		background: #173b30;
		color: #fffaf0;
		font-size: 0.8rem;
		font-weight: 800;
		cursor: pointer;
	}

	.invite-form button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.section-heading {
		margin: 0.5rem 0 1.25rem;
	}

	.filters {
		grid-template-columns: auto minmax(10rem, 1fr) auto minmax(10rem, 1fr);
	}

	.table-wrap {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	th,
	td {
		padding: 0.85rem 0.65rem;
		border-bottom: 1px solid #d7e0d8;
		font-size: 0.84rem;
		white-space: nowrap;
	}

	th {
		color: #60756a;
		font-size: 0.7rem;
		text-transform: uppercase;
	}

	.score-cell {
		font-weight: 800;
	}

	.empty-state,
	.notice {
		color: #60756a;
		font-size: 0.9rem;
	}

	.notice-error {
		color: #b23e2d;
	}

	:global(button:focus-visible),
	:global(input:focus-visible),
	:global(select:focus-visible) {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}

	@media (max-width: 900px) {
		.account-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.section-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}

	@media (max-width: 600px) {
		.invite-form,
		.filters {
			grid-template-columns: 1fr;
		}
	}
</style>
