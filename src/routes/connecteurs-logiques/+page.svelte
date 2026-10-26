<script lang="ts">
	import LogicalConnectors from '../../lib/LogicalConnectors.svelte';
</script>

<svelte:head>
	<title>Connecteurs logiques · Objectif B1</title>
	<meta
		name="description"
		content="Retrouve les connecteurs logiques classés par catégories, avec leurs usages et exemples."
	/>
</svelte:head>

<main class="connectors-page">
	<LogicalConnectors />
</main>

<style>
	.connectors-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 2rem clamp(1.25rem, 6vw, 6.5rem) 0;
	}
</style>
