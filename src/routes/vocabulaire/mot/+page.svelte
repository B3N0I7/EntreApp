<script lang="ts">
	import VocabularyFlashcards from '../../../lib/VocabularyFlashcards.svelte';
</script>

<svelte:head>
	<title>Trouve la définition · Atelier</title>
	<meta
		name="description"
		content="Révise le vocabulaire en retrouvant la définition de chaque mot."
	/>
</svelte:head>

<VocabularyFlashcards direction="word-to-definition" />
