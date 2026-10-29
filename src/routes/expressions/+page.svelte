<script lang="ts">
	import { page } from '$app/state';
	import expressionData from '../../lib/data/expression.json';
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
	<title>Expressions françaises · Objectif B1</title>
	<meta
		name="description"
		content="Révise les expressions françaises et retrouve leur définition ou leur formulation."
	/>
</svelte:head>

<main class="expressions-page">
	{#key direction}
		<VocabularyFlashcards
			{direction}
			catalogue={expressionData}
			fixedTheme="Expressions françaises"
			onDirectionChange={changeDirection}
		/>
	{/key}
</main>

<style>
	.expressions-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2rem clamp(1.25rem, 6vw, 6.5rem) 0;
	}
</style>
