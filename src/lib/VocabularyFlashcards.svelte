<script lang="ts">
	import {
		createAnswerOptions,
		getCardContent,
		THEMES,
		vocabularyForTheme,
		type AnswerMode,
		type AnswerOption,
		type VocabularyDirection
	} from './vocabulary';

	type Props = {
		direction: VocabularyDirection;
	};

	let { direction }: Props = $props();
	let selectedTheme = $state(THEMES[0] ?? '');
	let answerMode = $state<AnswerMode>('self-assessment');
	let currentIndex = $state(0);
	let answerRevealed = $state(false);
	let selectedAnswer = $state<string | null>(null);
	let seriesComplete = $state(false);
	let knownCount = $state(0);
	let reviewCount = $state(0);
	let correctCount = $state(0);
	let incorrectCount = $state(0);

	let entries = $derived(vocabularyForTheme(selectedTheme));
	let currentEntry = $derived(entries[currentIndex]);
	let card = $derived(currentEntry ? getCardContent(currentEntry, direction) : null);
	let options = $derived.by(() => {
		if (answerMode !== 'multiple-choice' || !currentEntry) return [];
		try {
			return createAnswerOptions(entries, currentEntry, direction);
		} catch {
			return [];
		}
	});
	let pageTitle = $derived(
		direction === 'word-to-definition' ? 'Trouve la définition' : 'Retrouve le mot'
	);
	let directionLabel = $derived(
		direction === 'word-to-definition' ? 'Mot → définition' : 'Définition → mot'
	);

	function resetStudy() {
		currentIndex = 0;
		answerRevealed = false;
		selectedAnswer = null;
		seriesComplete = false;
		knownCount = 0;
		reviewCount = 0;
		correctCount = 0;
		incorrectCount = 0;
	}

	function setAnswerMode(mode: AnswerMode) {
		if (answerMode === mode) return;
		answerMode = mode;
		resetStudy();
	}

	function advance() {
		if (currentIndex >= entries.length - 1) {
			seriesComplete = true;
			return;
		}
		currentIndex += 1;
		answerRevealed = false;
		selectedAnswer = null;
	}

	function assess(known: boolean) {
		if (known) knownCount += 1;
		else reviewCount += 1;
		advance();
	}

	function chooseAnswer(option: AnswerOption) {
		if (selectedAnswer !== null) return;
		selectedAnswer = option.value;
		if (option.correct) correctCount += 1;
		else incorrectCount += 1;
	}

	function restart() {
		resetStudy();
	}
</script>

<section class="study-shell" aria-labelledby="study-title">
	<header class="study-heading">
		<div>
			<p class="eyebrow">Vocabulaire · {directionLabel}</p>
			<h1 id="study-title">{pageTitle}</h1>
		</div>
		<p class="theme-total">{entries.length} cartes</p>
	</header>

	<div class="study-controls">
		<label class="theme-control" for="vocabulary-theme">
			<span>Thème</span>
			<select id="vocabulary-theme" bind:value={selectedTheme} onchange={resetStudy}>
				{#each THEMES as theme (theme)}
					<option value={theme}>{theme}</option>
				{/each}
			</select>
		</label>

		<div class="mode-control" role="group" aria-label="Mode de réponse">
			<button
				type="button"
				class:active={answerMode === 'self-assessment'}
				aria-pressed={answerMode === 'self-assessment'}
				onclick={() => setAnswerMode('self-assessment')}
			>
				Révélation
			</button>
			<button
				type="button"
				class:active={answerMode === 'multiple-choice'}
				aria-pressed={answerMode === 'multiple-choice'}
				onclick={() => setAnswerMode('multiple-choice')}
			>
				QCM
			</button>
		</div>
	</div>

	{#if seriesComplete}
		<section class="completion-panel" aria-labelledby="completion-title">
			<p class="eyebrow">{selectedTheme}</p>
			<h2 id="completion-title">Série terminée</h2>
			<p class="completion-result" role="status">
				{#if answerMode === 'self-assessment'}
					{knownCount} acquis · {reviewCount} à revoir
				{:else}
					{correctCount} bonnes réponses · {incorrectCount} à revoir
				{/if}
			</p>
			<button class="primary-button" type="button" onclick={restart}>Recommencer</button>
		</section>
	{:else if card && currentEntry}
		<div class="progress-heading">
			<span>Carte {currentIndex + 1} / {entries.length}</span>
			<span>{selectedTheme}</span>
		</div>
		<progress aria-label="Progression" max={entries.length} value={currentIndex + 1}></progress>

		<article class="flashcard" aria-labelledby="card-prompt">
			<div class="card-index" aria-hidden="true">
				{String(currentIndex + 1).padStart(2, '0')}
			</div>
			<p class="card-direction">{directionLabel}</p>
			<h2 id="card-prompt" class:definition-prompt={direction === 'definition-to-word'}>
				{card.prompt}
			</h2>

			{#if answerMode === 'self-assessment'}
				{#if answerRevealed}
					<div class="answer-reveal" aria-live="polite">
						<p>{direction === 'word-to-definition' ? 'Définition' : 'Mot'}</p>
						<div>{card.answer}</div>
					</div>
					<div class="assessment-actions" aria-label="Évaluation de la réponse">
						<button class="review-button" type="button" onclick={() => assess(false)}>
							À revoir
						</button>
						<button class="primary-button" type="button" onclick={() => assess(true)}>
							Acquis
						</button>
					</div>
				{:else}
					<button
						class="primary-button reveal-button"
						type="button"
						onclick={() => (answerRevealed = true)}
					>
						Révéler la réponse
					</button>
				{/if}
			{:else if options.length === 4}
				<div class="answer-options" role="group" aria-label="Réponses proposées">
					{#each options as option (option.value)}
						<button
							type="button"
							class="answer-option"
							class:correct={selectedAnswer === option.value && option.correct}
							class:incorrect={selectedAnswer === option.value && !option.correct}
							aria-pressed={selectedAnswer === option.value}
							disabled={selectedAnswer !== null}
							onclick={() => chooseAnswer(option)}
						>
							{option.value}
						</button>
					{/each}
				</div>
				{#if selectedAnswer !== null}
					<p class="answer-feedback" role="status">
						{#if options.find((option) => option.value === selectedAnswer)?.correct}
							Bonne réponse
						{:else}
							Réponse : {card.answer}
						{/if}
					</p>
					<button class="primary-button next-button" type="button" onclick={advance}>
						Carte suivante
					</button>
				{/if}
			{:else}
				<p class="answer-feedback" role="status">
					Ce thème ne contient pas assez de réponses distinctes pour un QCM.
				</p>
			{/if}
		</article>
	{/if}
</section>

<style>
	.study-shell {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.study-heading,
	.study-controls,
	.progress-heading,
	.assessment-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.study-heading {
		align-items: flex-end;
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
	p {
		margin-top: 0;
	}

	h1,
	h2 {
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-weight: 500;
	}

	h1 {
		margin-bottom: 0;
		font-size: 4.5rem;
		line-height: 0.98;
	}

	.theme-total {
		margin: 0 0 0.45rem;
		color: #60756a;
		font-size: 0.82rem;
		font-weight: 700;
		white-space: nowrap;
	}

	.study-controls {
		align-items: flex-end;
		margin-bottom: 2rem;
	}

	.theme-control {
		min-width: min(100%, 22rem);
		display: grid;
		gap: 0.5rem;
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 800;
	}

	select {
		min-height: 2.9rem;
		padding: 0 2.5rem 0 0.85rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #f7f8f2;
		color: #182c25;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.mode-control {
		display: flex;
		padding: 0.2rem;
		border: 1px solid #bdcbc0;
	}

	.mode-control button {
		min-height: 2.45rem;
		padding: 0.5rem 0.85rem;
		border: 0;
		background: transparent;
		color: #52665b;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
	}

	.mode-control button.active {
		background: #173b30;
		color: #f3f5e9;
	}

	.mode-control button:focus-visible,
	select:focus-visible,
	button:focus-visible {
		outline: 3px solid #f15d43;
		outline-offset: 3px;
	}

	.progress-heading {
		margin-bottom: 0.55rem;
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.progress-heading span:last-child {
		text-align: right;
	}

	progress {
		width: 100%;
		height: 0.3rem;
		display: block;
		margin-bottom: 1.15rem;
		border: 0;
		appearance: none;
	}

	progress::-webkit-progress-bar {
		background: #d3ddd4;
	}

	progress::-webkit-progress-value {
		background: #19866a;
	}

	progress::-moz-progress-bar {
		background: #19866a;
	}

	.flashcard,
	.completion-panel {
		position: relative;
		min-height: 27rem;
		padding: clamp(1.4rem, 4vw, 3rem);
		background: #f7f8f2;
		box-shadow: 0.55rem 0.55rem 0 #d3dfd2;
	}

	.card-index {
		position: absolute;
		top: 1.3rem;
		right: 1.4rem;
		color: #9bac9e;
		font-size: 0.78rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.card-direction {
		margin: 0 0 1rem;
		color: #19866a;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.flashcard h2 {
		max-width: 58rem;
		margin: 0 0 2rem;
		overflow-wrap: anywhere;
		font-size: 3.2rem;
		line-height: 1.12;
	}

	.flashcard h2.definition-prompt {
		font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
		font-size: 1.6rem;
		font-weight: 600;
		line-height: 1.5;
	}

	.primary-button,
	.review-button {
		min-height: 3rem;
		padding: 0.75rem 1.1rem;
		border: 1px solid #173b30;
		font-size: 0.86rem;
		font-weight: 800;
		cursor: pointer;
	}

	.primary-button {
		background: #173b30;
		color: #f3f5e9;
	}

	.primary-button:hover {
		background: #245342;
	}

	.review-button {
		background: transparent;
		color: #173b30;
	}

	.review-button:hover {
		background: #e8eee7;
	}

	.answer-reveal {
		margin: 0 0 1.5rem;
		padding-top: 1.25rem;
		border-top: 1px solid #ccd7ce;
		animation: reveal 220ms ease-out both;
	}

	.answer-reveal p {
		margin: 0 0 0.45rem;
		color: #60756a;
		font-size: 0.7rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.answer-reveal div {
		overflow-wrap: anywhere;
		font-size: 1rem;
		line-height: 1.65;
	}

	.assessment-actions {
		justify-content: flex-start;
	}

	.answer-options {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.answer-option {
		min-height: 3.25rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid #bdcbc0;
		background: #fff;
		color: #182c25;
		font-size: 0.88rem;
		line-height: 1.45;
		text-align: left;
		cursor: pointer;
	}

	.answer-option:hover:not(:disabled) {
		border-color: #173b30;
		background: #edf2ec;
	}

	.answer-option:disabled {
		cursor: default;
	}

	.answer-option.correct {
		border-color: #19866a;
		background: #e2f1e8;
	}

	.answer-option.incorrect {
		border-color: #d84831;
		background: #fae8e1;
	}

	.answer-feedback {
		margin: 1rem 0 0;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.next-button {
		margin-top: 0.9rem;
	}

	.completion-panel {
		min-height: 20rem;
		display: flex;
		align-items: flex-start;
		flex-direction: column;
		justify-content: center;
	}

	.completion-panel h2 {
		margin: 0 0 0.6rem;
		font-size: 3rem;
	}

	.completion-result {
		margin: 0 0 1.5rem;
		color: #60756a;
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

		.study-controls {
			align-items: stretch;
			flex-direction: column;
		}

		.theme-control {
			width: 100%;
		}

		.mode-control {
			align-self: flex-start;
		}

		.flashcard,
		.completion-panel {
			min-height: 24rem;
		}
	}

	@media (max-width: 420px) {
		.study-shell {
			padding: 2rem 1rem 3rem;
		}

		h1 {
			font-size: 2.7rem;
		}

		.progress-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.3rem;
		}

		.progress-heading span:last-child {
			text-align: left;
		}

		.flashcard,
		.completion-panel {
			min-height: 21rem;
			padding: 1.25rem;
		}

		.flashcard h2 {
			font-size: 2.2rem;
		}

		.flashcard h2.definition-prompt {
			font-size: 1.2rem;
		}

		.answer-options {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
		}
	}
</style>
