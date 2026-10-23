<script lang="ts">
	import { drawPerson, PEOPLE } from '../../lib/draw';

	let available = $state<string[]>([...PEOPLE]);
	let selectedPerson = $state<string | null>(null);
	let cycleNumber = $state(1);
	let cycleCompleted = $state(false);

	function draw() {
		const result = drawPerson(available);
		selectedPerson = result.selected;
		available = [...result.remaining];
		cycleCompleted = result.cycleComplete;

		if (result.cycleComplete) {
			cycleNumber += 1;
		}
	}
</script>

<svelte:head>
	<title>Tirage au sort</title>
	<meta name="description" content="Tirage au sort aléatoire parmi les personnes du groupe." />
</svelte:head>

<div class="app-shell">
	<main>
		<section class="draw-stage" aria-labelledby="page-title">
			<div class="stage-heading">
				<div class="stage-copy">
					<p class="eyebrow">Le groupe · 14 personnes</p>
					<h1 id="page-title">À qui<br />le tour<span class="title-mark">?</span></h1>
				</div>
				<div class="cycle-indicator" aria-live="polite">
					<span class="cycle-dot" aria-hidden="true"></span>
					Cycle {String(cycleNumber).padStart(2, '0')}
				</div>
			</div>

			<div class="result-panel">
				<div class="result-topline">
					<span>PERSONNE TIRÉE</span>
					<span class="result-index">{String(available.length).padStart(2, '0')} / 14</span>
				</div>
				<div class="result-name" role="status" aria-atomic="true">
					{selectedPerson ?? '—'}
				</div>
				<div class="result-bottomline">
					{#if cycleCompleted}
						<span class="cycle-message">Cycle terminé · liste renouvelée</span>
					{:else}
						<span
							>{available.length} personne{available.length === 1 ? '' : 's'} disponible{available.length ===
							1
								? ''
								: 's'}</span
						>
					{/if}
					<span class="result-spark" aria-hidden="true">✳</span>
				</div>
			</div>

			<button class="draw-button" type="button" onclick={draw}>
				Tirer un nom
				<span class="button-arrow" aria-hidden="true">↗</span>
			</button>
		</section>

		<section class="roster" aria-labelledby="roster-title">
			<div class="roster-heading">
				<div>
					<p class="eyebrow">Dans le tirage</p>
					<h2 id="roster-title">Personnes disponibles</h2>
				</div>
				<span class="roster-count" aria-label="Personnes disponibles">{available.length}</span>
			</div>

			<ul class="people-list" aria-label="Personnes disponibles">
				{#each available as person, index (person)}
					<li style={`--item-index: ${index}`}>{person}</li>
				{/each}
			</ul>
		</section>
	</main>

	<footer class="page-footer">
		<span>Tirage au sort</span>
		<span>14 noms · 1 choix à la fois</span>
	</footer>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		padding: 0 clamp(1.25rem, 6vw, 6.5rem);
		background-image: linear-gradient(115deg, rgb(255 255 255 / 0.28), transparent 45%);
	}

	.cycle-indicator {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.cycle-dot {
		width: 0.5rem;
		aspect-ratio: 1;
		border-radius: 50%;
		background: #19866a;
		box-shadow: 0 0 0 3px rgb(25 134 106 / 0.13);
	}

	main {
		display: grid;
		grid-template-columns: minmax(0, 1.12fr) minmax(17rem, 0.88fr);
		gap: clamp(3rem, 8vw, 8rem);
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(3rem, 9vh, 6.75rem) 0 5rem;
		animation: arrive 550ms ease-out both;
	}

	.draw-stage {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.stage-heading {
		width: 100%;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.stage-copy {
		min-width: 0;
	}

	.eyebrow {
		margin: 0 0 0.9rem;
		color: #60756a;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1,
	h2,
	p {
		margin-top: 0;
	}

	h1 {
		margin-bottom: 2.6rem;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 6.35rem;
		font-weight: 500;
		line-height: 0.9;
	}

	.title-mark {
		color: #f15d43;
	}

	.result-panel {
		width: 100%;
		min-height: 13rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1.1rem 1.25rem 1rem;
		background: #173b30;
		color: #f3f5e9;
		box-shadow: 0.55rem 0.55rem 0 #d3dfd2;
	}

	.result-topline,
	.result-bottomline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: 0.68rem;
		font-weight: 700;
	}

	.result-index {
		color: #a9c3b6;
		font-variant-numeric: tabular-nums;
	}

	.result-name {
		overflow-wrap: anywhere;
		padding: 1.6rem 0;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 4rem;
		line-height: 1;
		animation: reveal 360ms ease-out both;
	}

	.result-bottomline {
		color: #c2d3c7;
	}

	.cycle-message {
		color: #f4ce54;
	}

	.result-spark {
		color: #f4ce54;
		font-size: 1.2rem;
	}

	.draw-button {
		min-height: 3.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 1.25rem;
		padding: 0.85rem 1.1rem 0.85rem 1.25rem;
		border: 0;
		background: #f15d43;
		color: #fffaf0;
		font-size: 0.9rem;
		font-weight: 800;
		cursor: pointer;
		transition:
			background 150ms ease,
			transform 150ms ease;
	}

	.draw-button:hover {
		transform: translateY(-2px);
		background: #d84831;
	}

	.draw-button:focus-visible {
		outline: 3px solid #182c25;
		outline-offset: 3px;
	}

	.button-arrow {
		font-size: 1.2rem;
	}

	.roster {
		align-self: center;
		width: 100%;
		max-width: 28rem;
	}

	.roster-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #bdcbc0;
	}

	.roster-heading .eyebrow {
		margin-bottom: 0.45rem;
	}

	h2 {
		margin-bottom: 0;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 1.65rem;
		font-weight: 500;
	}

	.roster-count {
		display: grid;
		width: 2.6rem;
		aspect-ratio: 1;
		place-items: center;
		border: 1px solid #aebdb1;
		border-radius: 50%;
		font-size: 0.8rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.people-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.people-list li {
		min-width: 0;
		padding: 0.92rem 0.4rem 0.92rem 0;
		border-bottom: 1px solid #d3ddd4;
		font-size: 0.9rem;
		animation: reveal 220ms ease-out both;
		animation-delay: calc(var(--item-index) * 18ms);
	}

	.page-footer {
		max-width: 76rem;
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin: 0 auto;
		padding: 1.1rem 0 1.5rem;
		border-top: 1px solid #ccd7ce;
		color: #60756a;
		font-size: 0.7rem;
	}

	@keyframes arrive {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(5px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 760px) {
		main {
			grid-template-columns: 1fr;
			gap: 3.5rem;
			padding-top: 3.25rem;
		}

		h1 {
			margin-bottom: 2rem;
			font-size: 4.5rem;
		}

		.result-name {
			font-size: 3.5rem;
		}

		.roster {
			max-width: none;
		}
	}

	@media (max-width: 420px) {
		.app-shell {
			padding-right: 1rem;
			padding-left: 1rem;
		}

		.result-panel {
			min-height: 11rem;
		}

		.cycle-indicator {
			gap: 0.4rem;
			font-size: 0.72rem;
		}

		h1 {
			font-size: 3.5rem;
		}

		.result-name {
			font-size: 2.6rem;
		}

		.people-list li {
			font-size: 0.82rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			scroll-behavior: auto !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
