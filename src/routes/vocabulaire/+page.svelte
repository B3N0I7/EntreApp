<script lang="ts">
	import { page } from '$app/state';
	import VocabularyFlashcards from '../../lib/VocabularyFlashcards.svelte';
	import type { VocabularyDirection } from '../../lib/vocabulary';

	let direction = $state<VocabularyDirection>(
		page.url.searchParams.get('direction') === 'definition-to-word'
			? 'definition-to-word'
			: 'word-to-definition'
	);
</script>

<svelte:head>
	<title>Vocabulaire · Objectif B1</title>
	<meta
		name="description"
		content="Révise le vocabulaire en retrouvant les définitions ou les mots correspondants."
	/>
</svelte:head>

<main class="vocabulary-page">
	<label for="vocabulary-direction">
		<span>Sens des cartes</span>
		<select id="vocabulary-direction" bind:value={direction}>
			<option value="word-to-definition">Mot → définition</option>
			<option value="definition-to-word">Définition → mot</option>
		</select>
	</label>
	{#key direction}
		<VocabularyFlashcards {direction} />
	{/key}
</main>

<style>
	.vocabulary-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2rem clamp(1.25rem, 6vw, 6.5rem) 0;
	}

	label {
		display: grid;
		gap: 0.45rem;
		max-width: 18rem;
		margin-bottom: 1rem;
		color: #405b4a;
		font-size: 0.82rem;
		font-weight: 700;
	}

	select {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid #aebeb2;
		border-radius: 4px;
		background: #fff;
		color: #1f3025;
		font: inherit;
	}

	@media (max-width: 760px) {
		.vocabulary-page :global(.study-shell) {
			padding-inline: 0;
		}
	}
</style>
