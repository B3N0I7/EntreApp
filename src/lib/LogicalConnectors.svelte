<script lang="ts">
	import { LOGICAL_CONNECTOR_CATEGORIES } from './logicalConnectors';
	let selectedCategory = $state('all');
	let visibleCategories = $derived(
		selectedCategory === 'all'
			? LOGICAL_CONNECTOR_CATEGORIES
			: LOGICAL_CONNECTOR_CATEGORIES.filter((category) => category.id === selectedCategory)
	);
	let categoryCount = $derived(visibleCategories.length);
	let connectorCount = $derived(
		visibleCategories.reduce((total, category) => total + category.connectors.length, 0)
	);

	type ExampleSegment = {
		text: string;
		emphasis: boolean;
	};

	function exampleSegments(example: string): ExampleSegment[] {
		return example
			.split(/(\*\*.*?\*\*)/g)
			.filter(Boolean)
			.map((part) => {
				const emphasis = part.startsWith('**') && part.endsWith('**');
				return {
					text: emphasis ? part.slice(2, -2) : part,
					emphasis
				};
			});
	}
</script>

<section class="study-shell" aria-labelledby="connectors-title">
	<header class="study-heading">
		<div>
			<p class="eyebrow">Français · Grammaire</p>
			<h1 id="connectors-title">Connecteurs logiques</h1>
			<label class="category-filter" for="connector-category">
				<span>Filtrer par catégorie</span>
				<select id="connector-category" bind:value={selectedCategory}>
					<option value="all">Toutes les catégories</option>
					{#each LOGICAL_CONNECTOR_CATEGORIES as category (category.id)}
						<option value={category.id}>{category.title}</option>
					{/each}
				</select>
			</label>
		</div>
		<p class="theme-total">
			{categoryCount}
			{categoryCount === 1 ? 'catégorie' : 'catégories'} · {connectorCount}
			{connectorCount === 1 ? 'connecteur' : 'connecteurs'}
		</p>
	</header>

	<div class="category-list">
		{#each visibleCategories as category, categoryIndex (category.id)}
			<section class="category-section" aria-labelledby="category-{category.id}">
				<header class="category-heading">
					<span class="category-index" aria-hidden="true">
						{String(categoryIndex + 1).padStart(2, '0')}
					</span>
					<h2 id="category-{category.id}">{category.title}</h2>
				</header>

				<div class="connector-grid">
					{#each category.connectors as connector (connector.name)}
						<article class="connector-entry">
							<h3>{connector.name}</h3>
							<p class="connector-usage">{connector.usage}</p>
							<ul class="example-list" aria-label="Exemples pour {connector.name}">
								{#each connector.examples as example, exampleIndex (example)}
									<li>
										<span class="example-label">Exemple {exampleIndex + 1}</span>
										<span class="example-text">
											{#each exampleSegments(example) as segment, segmentIndex (segmentIndex)}
												{#if segment.emphasis}<strong>{segment.text}</strong
													>{:else}{segment.text}{/if}
											{/each}
										</span>
									</li>
								{/each}
							</ul>
						</article>
					{/each}
				</div>
			</section>
		{/each}
	</div>
</section>

<style>
	.study-shell {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.study-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 2.25rem;
	}

	.eyebrow {
		margin: 0 0 0.7rem;
		color: #60756a;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1,
	h2,
	h3,
	p {
		margin-top: 0;
	}

	h1,
	h2,
	h3 {
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-weight: 500;
	}

	h1 {
		margin-bottom: 0;
		font-size: 4.5rem;
		line-height: 0.98;
		overflow-wrap: anywhere;
	}

	.theme-total {
		margin: 0 0 0.45rem;
		color: #60756a;
		font-size: 0.82rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.category-filter {
		display: grid;
		gap: 0.45rem;
		width: min(100%, 23rem);
		margin-top: 1.35rem;
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 800;
	}

	.category-filter select {
		min-width: 0;
		width: 100%;
		min-height: 2.9rem;
		padding: 0 0.85rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #f7f8f2;
		color: #182c25;
		font: inherit;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.category-filter select:focus-visible {
		outline: 3px solid #f15d43;
		outline-offset: 3px;
	}

	.category-section + .category-section {
		margin-top: 2.6rem;
	}

	.category-heading {
		display: flex;
		align-items: baseline;
		gap: 0.85rem;
		padding-bottom: 0.8rem;
		border-bottom: 1px solid #bdcbc0;
	}

	.category-index {
		color: #f15d43;
		font-size: 0.76rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.category-heading h2 {
		margin-bottom: 0;
		font-size: 2.15rem;
		line-height: 1.15;
		overflow-wrap: anywhere;
	}

	.connector-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		column-gap: 2.25rem;
	}

	.connector-entry {
		min-width: 0;
		padding: 1.35rem 0 1.25rem;
		border-bottom: 1px solid #d3ddd4;
	}

	.connector-entry h3 {
		margin-bottom: 0.35rem;
		font-size: 1.35rem;
		line-height: 1.2;
		overflow-wrap: anywhere;
	}

	.connector-usage {
		margin-bottom: 0.8rem;
		color: #60756a;
		font-size: 0.78rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.example-list {
		display: grid;
		gap: 0.55rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.example-list li {
		display: grid;
		grid-template-columns: 5.4rem minmax(0, 1fr);
		align-items: baseline;
		gap: 0.55rem;
	}

	.example-label {
		color: #19866a;
		font-size: 0.64rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.example-text {
		font-size: 0.84rem;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}

	.example-text strong {
		color: #173b30;
		font-weight: 800;
	}

	@media (max-width: 760px) {
		.study-shell {
			padding-top: 2.5rem;
		}

		.study-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.6rem;
			margin-bottom: 1.6rem;
		}

		h1 {
			font-size: 3.5rem;
		}

		.theme-total {
			margin-bottom: 0;
		}

		.category-section + .category-section {
			margin-top: 2.1rem;
		}

		.category-heading h2 {
			font-size: 1.8rem;
		}

		.connector-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 380px) {
		h1 {
			font-size: 3rem;
		}

		.example-list li {
			grid-template-columns: 4.6rem minmax(0, 1fr);
			gap: 0.4rem;
		}
	}
</style>
