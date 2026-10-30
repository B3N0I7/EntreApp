<script lang="ts">
	import resources from '#lib/data/studyResources.json';
</script>

<svelte:head>
	<title>Ressources · Objectif B1</title>
	<meta
		name="description"
		content="Conseils de révision et ressources pour apprendre le français."
	/>
</svelte:head>

<main class="resources-page">
	<header class="page-heading">
		<p class="eyebrow">Pour progresser</p>
		<h1>Ressources</h1>
	</header>

	<section aria-labelledby="tips-title">
		<h2 id="tips-title">Conseils de révision</h2>
		<ol class="tips-list">
			{#each resources.tips as tip, index (tip.title)}
				<li>
					<span class="tip-number">0{index + 1}</span>
					<div>
						<h3>{tip.title}</h3>
						<p>{tip.text}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section class="resource-section" aria-labelledby="links-title">
		<h2 id="links-title">Ressources externes</h2>
		<ul class="resource-list">
			{#each resources.resources as resource (resource.url)}
				<li>
					<div>
						<p class="resource-level">{resource.level}</p>
						<h3>{resource.title}</h3>
						<p>{resource.description}</p>
					</div>
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a href={resource.url} target="_blank" rel="noreferrer"
						>Ouvrir la ressource <span aria-hidden="true">↗</span></a
					>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.resources-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.page-heading {
		margin-bottom: 2rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #ccd7ce;
	}

	.eyebrow,
	.resource-level {
		margin: 0 0 0.45rem;
		color: #60756a;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3 {
		margin: 0;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-weight: 500;
	}

	h1 {
		font-size: 3.5rem;
	}

	h2 {
		margin-bottom: 1rem;
		font-size: 1.8rem;
	}

	h3 {
		font-size: 1.2rem;
	}

	.tips-list,
	.resource-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.tips-list li {
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem 0;
		border-top: 1px solid #ccd7ce;
	}

	.tip-number {
		color: #e85e43;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.tips-list p,
	.resource-list li > div > p:last-child {
		max-width: 48rem;
		margin: 0.45rem 0 0;
		color: #52665b;
		line-height: 1.65;
	}

	.resource-section {
		margin-top: 3.25rem;
		padding-top: 1.5rem;
		border-top: 1px solid #ccd7ce;
	}

	.resource-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		padding: 1.25rem 0;
		border-top: 1px solid #ccd7ce;
	}

	.resource-level {
		margin-bottom: 0.35rem;
	}

	.resource-list a {
		flex: 0 0 auto;
		color: #173b30;
		font-size: 0.84rem;
		font-weight: 800;
		text-underline-offset: 0.2rem;
	}

	:global(a:focus-visible) {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}

	@media (max-width: 640px) {
		.resource-list li {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.75rem;
		}
	}
</style>
