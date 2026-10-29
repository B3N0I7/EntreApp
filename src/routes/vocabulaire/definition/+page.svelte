<script lang="ts">
	import vocabularyData from '../../../lib/data/vocabulary.json';
	import VocabularyFlashcards from '../../../lib/VocabularyFlashcards.svelte';
</script>

<svelte:head>
	<title>Donne la définition · Atelier</title>
	<meta
		name="description"
		content="Révise le vocabulaire en retrouvant le mot à partir de sa définition."
	/>
</svelte:head>

<VocabularyFlashcards direction="definition-to-word" catalogue={vocabularyData} />
