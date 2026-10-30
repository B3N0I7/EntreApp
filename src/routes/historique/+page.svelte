<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { storeReplay } from '#lib/replay';
	import { chargerHistorique, type Erreur, type ModuleType, type Partie } from '#lib/sheetService';

	let parties = $state<Partie[]>([]);
	let loading = $state(true);
	let loadError = $state('');
	let historyFromCache = $state(false);
	let recentModule = $state<ModuleType>('vocabulaire-mot');
	let recentCount = $state(10);
	let replayingRecent = $state(false);
	let recentReplayMessage = $state('');
	let recentReplayError = $state(false);

	onMount(async () => {
		try {
			const result = await chargerHistorique(undefined, page.data.user?.userId);
			parties = result.parties;
			historyFromCache = result.fromCache;
		} catch {
			loadError = 'Impossible de charger votre historique.';
		} finally {
			loading = false;
		}
	});

	function moduleName(module: Partie['module']): string {
		return {
			'vocabulaire-definition': 'Donne la définition',
			'vocabulaire-mot': 'Trouve la définition',
			'expressions-word-to-definition': 'Expressions françaises · expression → définition',
			'expressions-definition-to-word': 'Expressions françaises · définition → expression',
			conjugaison: 'Conjugaison'
		}[module];
	}

	function dateLabel(value: string): string {
		const date = new Date(value);
		return Number.isNaN(date.getTime())
			? value
			: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
	}

	function errorLabel(error: Erreur): string {
		if ('verbe' in error) {
			return `${error.verbe} · ${error.temps} · ${error.pronom} : « ${error.reponseEleve || 'sans réponse'} » → ${error.correction.join(' / ')}`;
		}
		return `${error.mot} : ${error.reponseEleve || 'à revoir'} → ${error.correction}`;
	}

	async function navigateToReplay(module: ModuleType) {
		if (
			module === 'expressions-word-to-definition' ||
			module === 'expressions-definition-to-word'
		) {
			const direction =
				module === 'expressions-word-to-definition' ? 'word-to-definition' : 'definition-to-word';
			// The route is resolved before appending the replay direction query.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`${resolve('/expressions')}?direction=${direction}`);
			return;
		}
		if (module === 'vocabulaire-mot' || module === 'vocabulaire-definition') {
			const direction = module === 'vocabulaire-mot' ? 'word-to-definition' : 'definition-to-word';
			// The route is resolved before appending the replay direction query.
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			await goto(`${resolve('/vocabulaire')}?direction=${direction}`);
			return;
		}
		// The route is resolved before appending the replay query.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		await goto(`${resolve('/conjugaison')}?replay=1`);
	}

	async function replay(partie: Partie) {
		if (!partie.erreurs.length) return;
		storeReplay({ module: partie.module, erreurs: partie.erreurs });
		await navigateToReplay(partie.module);
	}

	async function replayRecentErrors() {
		if (replayingRecent) return;
		replayingRecent = true;
		recentReplayMessage = '';
		recentReplayError = false;
		try {
			const query = new URLSearchParams({ module: recentModule, limit: String(recentCount) });
			const response = await fetch(`/api/history/errors?${query}`);
			const result = (await response.json().catch(() => null)) as {
				erreurs?: Erreur[];
				error?: string;
			} | null;
			if (!response.ok)
				throw new Error(result?.error ?? 'Impossible de charger les erreurs récentes.');
			if (!result?.erreurs?.length) {
				recentReplayMessage = 'Aucune erreur récente pour cette activité.';
				return;
			}
			storeReplay({ module: recentModule, erreurs: result.erreurs });
			await navigateToReplay(recentModule);
		} catch (error) {
			recentReplayMessage =
				error instanceof Error ? error.message : 'Impossible de lancer le rejeu.';
			recentReplayError = true;
		} finally {
			replayingRecent = false;
		}
	}
</script>

<svelte:head>
	<title>Historique · Objectif B1</title>
	<meta name="description" content="Historique des exercices et erreurs à retravailler." />
</svelte:head>

<main class="history-page">
	<header class="page-heading">
		<div>
			<p class="eyebrow">Votre parcours</p>
			<h1>Historique</h1>
		</div>
		<span class="entry-count">{parties.length} partie{parties.length === 1 ? '' : 's'}</span>
	</header>
	<section class="recent-replay" aria-label="Rejouer les erreurs récentes">
		<label for="recent-module">Activité</label>
		<select id="recent-module" bind:value={recentModule}>
			<option value="vocabulaire-mot">Vocabulaire · mot → définition</option>
			<option value="vocabulaire-definition">Vocabulaire · définition → mot</option>
			<option value="expressions-word-to-definition">Expressions · expression → définition</option>
			<option value="expressions-definition-to-word">Expressions · définition → expression</option>
			<option value="conjugaison">Conjugaison</option>
		</select>
		<label for="recent-count">Dernières erreurs</label>
		<input id="recent-count" type="number" min="1" max="100" bind:value={recentCount} />
		<button
			type="button"
			onclick={replayRecentErrors}
			disabled={replayingRecent || recentCount < 1 || recentCount > 100}
		>
			{replayingRecent ? 'Chargement…' : 'Rejouer'}
		</button>
		{#if recentReplayMessage}
			<p
				class:notice-error={recentReplayError}
				class="recent-replay-status"
				role={recentReplayError ? 'alert' : 'status'}
			>
				{recentReplayMessage}
			</p>
		{/if}
	</section>
	{#if historyFromCache}
		<p class="notice" role="status">Historique en cache; les données peuvent être anciennes.</p>
	{/if}

	{#if loading}
		<p role="status">Chargement…</p>
	{:else if loadError}
		<p class="notice error" role="alert">{loadError}</p>
	{:else if parties.length === 0}
		<p class="empty-state">Aucune partie enregistrée pour le moment.</p>
	{:else}
		<ol class="history-list">
			{#each parties as partie, index (`${partie.date}-${index}`)}
				<li class="history-entry">
					<div class="entry-heading">
						<div>
							<p class="eyebrow">{moduleName(partie.module)}</p>
							<h2>{partie.score}</h2>
						</div>
						<time datetime={partie.date}>{dateLabel(partie.date)}</time>
					</div>
					{#if partie.erreurs.length}
						<details>
							<summary
								>{partie.erreurs.length} erreur{partie.erreurs.length === 1 ? '' : 's'}</summary
							>
							<ul class="error-list">
								{#each partie.erreurs as erreur, errorIndex (`${errorIndex}-${errorLabel(erreur)}`)}
									<li>{errorLabel(erreur)}</li>
								{/each}
							</ul>
						</details>
						<button class="replay-button" type="button" onclick={() => replay(partie)}>
							Rejouer les erreurs
						</button>
					{:else}
						<p class="all-correct">Aucune erreur à reprendre.</p>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</main>

<style>
	.history-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.page-heading,
	.entry-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.page-heading {
		margin-bottom: 2rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #ccd7ce;
	}

	.recent-replay {
		display: grid;
		grid-template-columns: auto minmax(12rem, 1fr) auto 7rem auto;
		align-items: end;
		gap: 0.75rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #ccd7ce;
	}

	.recent-replay label {
		color: #60756a;
		font-size: 0.74rem;
		font-weight: 800;
	}

	.recent-replay select,
	.recent-replay input {
		min-height: 2.8rem;
		padding: 0 0.7rem;
		border: 1px solid #bdcbc0;
		background: #fff;
		color: #182c25;
		font: inherit;
	}

	.recent-replay button {
		min-height: 2.8rem;
		padding: 0 1rem;
		border: 0;
		background: #173b30;
		color: #fffaf0;
		font-weight: 800;
		cursor: pointer;
	}

	.recent-replay button:disabled {
		cursor: wait;
		opacity: 0.6;
	}

	.recent-replay-status {
		grid-column: 1 / -1;
		margin: 0;
		color: #60756a;
		font-size: 0.86rem;
	}

	.recent-replay-status.notice-error {
		color: #b23e2d;
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
		font-size: 1.8rem;
	}

	.entry-count,
	time {
		color: #60756a;
		font-size: 0.82rem;
		font-weight: 700;
	}

	.history-list {
		display: grid;
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.history-entry {
		padding: 1.25rem 0;
		border-bottom: 1px solid #ccd7ce;
	}

	.entry-heading {
		margin-bottom: 1rem;
	}

	details summary {
		color: #52665b;
		font-size: 0.86rem;
		font-weight: 800;
		cursor: pointer;
	}

	.error-list {
		display: grid;
		gap: 0.5rem;
		padding-left: 1.25rem;
		color: #52665b;
		font-size: 0.84rem;
		line-height: 1.5;
	}

	.replay-button {
		min-height: 2.6rem;
		margin-top: 0.75rem;
		padding: 0 0.9rem;
		border: 1px solid #173b30;
		background: transparent;
		color: #173b30;
		font-size: 0.82rem;
		font-weight: 800;
		cursor: pointer;
	}

	.all-correct,
	.empty-state,
	.notice {
		color: #60756a;
		font-size: 0.9rem;
	}

	.notice.error {
		color: #b23e2d;
	}

	.replay-button:focus-visible {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}

	@media (max-width: 560px) {
		.recent-replay {
			grid-template-columns: 1fr;
		}

		.entry-heading {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
