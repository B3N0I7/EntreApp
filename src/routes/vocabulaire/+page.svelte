<script lang="ts">
	import { page } from '$app/state';
	import VocabularyFlashcards from '../../lib/VocabularyFlashcards.svelte';
	import type { VocabularyDirection } from '../../lib/vocabulary';

	let direction = $state<VocabularyDirection>(
		page.url.searchParams.get('direction') === 'definition-to-word'
			? 'definition-to-word'
			: 'word-to-definition'
	);

	function changeDirection(nextDirection: VocabularyDirection) {
		direction = nextDirection;
	}
</script>

<svelte:head>
	<title>Vocabulaire · Objectif B1</title>
	<meta
		name="description"
		content="Révise le vocabulaire en retrouvant les définitions ou les mots correspondants."
	/>
</svelte:head>

<main class="vocabulary-page">
	{#key direction}
		<VocabularyFlashcards {direction} onDirectionChange={changeDirection} />
	{/key}
</main>

<style>
	.vocabulary-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2rem clamp(1.25rem, 6vw, 6.5rem) 0;
	}

	@media (max-width: 760px) {
		.vocabulary-page :global(.study-shell) {
			padding-inline: 0;
		}
	}
</style>
