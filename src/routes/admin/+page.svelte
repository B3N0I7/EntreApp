<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { chargerHistorique, type Partie } from '#lib/sheetService';

	let { data }: PageProps = $props();
	let selectedUser = $state('all');
	let selectedModule = $state('all');
	let parties = $state<Partie[]>([]);
	let pin = $state('');
	let loading = $state(true);
	let savingPin = $state(false);
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
			parties = await chargerHistorique(selectedUser === 'all' ? undefined : selectedUser);
		} catch {
			notice = 'Impossible de charger cet historique.';
			noticeIsError = true;
		} finally {
			loading = false;
		}
	}

	onMount(loadHistory);

	async function resetPin(event: SubmitEvent) {
		event.preventDefault();
		if (savingPin || !/^\d{6,12}$/.test(pin)) return;
		savingPin = true;
		notice = '';
		try {
			const response = await fetch(
				`/api/admin/accounts/${encodeURIComponent(selectedUserForPin)}/pin`,
				{
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ pin })
				}
			);
			const result = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) throw new Error(result?.error ?? 'Réinitialisation impossible.');
			pin = '';
			notice = `PIN réinitialisé pour ${data.accounts.find((account) => account.id === selectedUserForPin)?.name}.`;
			noticeIsError = false;
		} catch (cause) {
			notice = cause instanceof Error ? cause.message : 'Réinitialisation impossible.';
			noticeIsError = true;
		} finally {
			savingPin = false;
		}
	}

	let selectedUserForPin = $state('prof');
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

	<section class="pin-section" aria-labelledby="pin-title">
		<div>
			<p class="eyebrow">Comptes fixes · sans inscription</p>
			<h2 id="pin-title">Réinitialiser un PIN</h2>
		</div>
		<form class="pin-form" onsubmit={resetPin}>
			<label for="pin-account">Personne</label>
			<select id="pin-account" bind:value={selectedUserForPin}>
				{#each data.accounts as account (account.id)}
					<option value={account.id}>{account.name}</option>
				{/each}
			</select>
			<label for="new-pin">Nouveau PIN</label>
			<input
				id="new-pin"
				bind:value={pin}
				type="password"
				inputmode="numeric"
				pattern={'[0-9]{6,12}'}
				minlength="6"
				maxlength="12"
				autocomplete="new-password"
				required
			/>
			<button type="submit" disabled={savingPin || !/^\d{6,12}$/.test(pin)}>
				{savingPin ? 'Enregistrement…' : 'Enregistrer le PIN'}
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

	.pin-section,
	.history-section {
		padding: 1.4rem 0;
		border-top: 1px solid #ccd7ce;
	}

	.pin-section {
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

	.pin-form,
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

	.pin-form button {
		min-height: 2.8rem;
		padding: 0 0.9rem;
		border: 0;
		background: #173b30;
		color: #fffaf0;
		font-size: 0.8rem;
		font-weight: 800;
		cursor: pointer;
	}

	.pin-form button:disabled {
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
		.pin-section {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.section-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}

	@media (max-width: 600px) {
		.pin-form,
		.filters {
			grid-template-columns: 1fr;
		}
	}
</style>
