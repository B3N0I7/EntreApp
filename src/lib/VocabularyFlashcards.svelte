<script lang="ts">
	import { onMount } from 'svelte';
	import { takeReplay } from './replay';
	import { enregistrerPartie, type ErreurVocabulaire } from './sheetService';
	import {
		ALL_SECTIONS,
		canUseMultipleChoice,
		createAnswerOptions,
		createVocabularySession,
		getCardContent,
		maxVocabularySessionSize,
		RANDOM_SECTION,
		RANDOM_THEME,
		sectionsForTheme,
		THEMES,
		VOCABULARY,
		type AnswerMode,
		type AnswerOption,
		type VocabularyEntry,
		type VocabularyDirection
	} from './vocabulary';

	type Props = {
		direction: VocabularyDirection;
		fixedTheme?: string;
		onDirectionChange?: (direction: VocabularyDirection) => void;
	};

	let { direction, fixedTheme, onDirectionChange }: Props = $props();
	let selectedTheme = $state('');
	let selectedSection = $state(ALL_SECTIONS);
	let selectedLength = $state('5');
	let customLength = $state<number | undefined>(5);
	let answerMode = $state<AnswerMode>('self-assessment');
	let sessionEntries = $state<VocabularyEntry[]>([]);
	let activePool = $state<VocabularyEntry[]>([]);
	let sessionTheme = $state('');
	let sessionSection = $state<string | null>(null);
	let sessionSize = $state(0);
	let sessionError = $state('');
	let currentIndex = $state(0);
	let answerRevealed = $state(false);
	let selectedAnswer = $state<string | null>(null);
	let seriesComplete = $state(false);
	let knownCount = $state(0);
	let reviewCount = $state(0);
	let correctCount = $state(0);
	let incorrectCount = $state(0);
	let errors = $state<ErreurVocabulaire[]>([]);
	let completionRecorded = $state(false);
	let persistenceError = $state('');

	let entries = $derived(sessionEntries);
	let availableSections = $derived(
		selectedTheme === RANDOM_THEME ? [] : sectionsForTheme(selectedTheme)
	);
	let maximumAvailable = $derived(
		maxVocabularySessionSize(selectedTheme, selectedSection, direction)
	);
	let qcmAvailable = $derived(canUseMultipleChoice(activePool, direction));
	let currentEntry = $derived(sessionEntries[currentIndex]);
	let card = $derived(currentEntry ? getCardContent(currentEntry, direction) : null);
	let options = $derived.by(() => {
		if (answerMode !== 'multiple-choice' || !currentEntry) return [];
		try {
			return createAnswerOptions(activePool, currentEntry, direction);
		} catch {
			return [];
		}
	});
	let pageTitle = $derived(
		fixedTheme ?? (direction === 'word-to-definition' ? 'Trouve la définition' : 'Retrouve le mot')
	);
	let directionLabel = $derived(
		fixedTheme
			? direction === 'word-to-definition'
				? 'Expression → définition'
				: 'Définition → expression'
			: direction === 'word-to-definition'
				? 'Mot → définition'
				: 'Définition → mot'
	);

	function moduleForDirection() {
		if (fixedTheme) {
			return direction === 'word-to-definition'
				? 'expressions-word-to-definition'
				: 'expressions-definition-to-word';
		}
		return direction === 'word-to-definition' ? 'vocabulaire-mot' : 'vocabulaire-definition';
	}

	function resetStudy() {
		currentIndex = 0;
		answerRevealed = false;
		selectedAnswer = null;
		seriesComplete = false;
		knownCount = 0;
		reviewCount = 0;
		correctCount = 0;
		incorrectCount = 0;
		errors = [];
		completionRecorded = false;
		persistenceError = '';
	}

	function applySession(session: ReturnType<typeof createVocabularySession>, quantity: number) {
		resetStudy();
		activePool = session.pool;
		sessionEntries = session.entries;
		sessionTheme = session.theme;
		sessionSection = session.section;
		sessionSize = quantity;
		sessionError = '';
		if (!canUseMultipleChoice(session.pool, direction)) answerMode = 'self-assessment';
	}

	function startStudy() {
		const quantity = selectedLength === 'custom' ? customLength : Number(selectedLength);
		if (!Number.isInteger(quantity) || quantity === undefined || quantity < 1) {
			resetStudy();
			sessionEntries = [];
			activePool = [];
			sessionError = 'Saisissez un nombre entier supérieur ou égal à 1.';
			return;
		}

		try {
			applySession(
				createVocabularySession(selectedTheme, selectedSection, direction, quantity),
				quantity
			);
		} catch (error) {
			resetStudy();
			sessionEntries = [];
			activePool = [];
			sessionError = error instanceof Error ? error.message : 'Impossible de créer cette série.';
		}
	}

	function changeTheme() {
		selectedSection = ALL_SECTIONS;
		startStudy();
	}

	function setAnswerMode(mode: AnswerMode) {
		if (answerMode === mode || (mode === 'multiple-choice' && !qcmAvailable)) return;
		answerMode = mode;
		resetStudy();
	}

	function advance() {
		if (currentIndex >= entries.length - 1) {
			void completeSeries();
			return;
		}
		currentIndex += 1;
		answerRevealed = false;
		selectedAnswer = null;
	}

	function assess(known: boolean) {
		if (!currentEntry || !card) return;
		if (known) knownCount += 1;
		else {
			reviewCount += 1;
			errors = [
				...errors,
				{
					entryId: currentEntry.id,
					direction,
					mode: answerMode,
					mot: currentEntry.word,
					reponseEleve: '',
					correction: card.answer
				}
			];
		}
		advance();
	}

	function chooseAnswer(option: AnswerOption) {
		if (selectedAnswer !== null || !currentEntry || !card) return;
		selectedAnswer = option.value;
		if (option.correct) correctCount += 1;
		else {
			incorrectCount += 1;
			errors = [
				...errors,
				{
					entryId: currentEntry.id,
					direction,
					mode: 'multiple-choice',
					mot: currentEntry.word,
					reponseEleve: option.value,
					correction: card.answer
				}
			];
		}
	}

	async function completeSeries() {
		seriesComplete = true;
		if (completionRecorded) return;
		completionRecorded = true;
		const successfulCount = answerMode === 'self-assessment' ? knownCount : correctCount;
		const module = moduleForDirection();
		try {
			await enregistrerPartie(module, `${successfulCount}/${sessionEntries.length}`, errors);
		} catch (error) {
			console.error('Échec de l’enregistrement de la partie de vocabulaire.', error);
			persistenceError = 'La partie est terminée, mais son enregistrement a échoué.';
		}
	}

	function startReplay(replayErrors: import('./sheetService').Erreur[]) {
		const matchingErrors = replayErrors.filter(
			(error): error is ErreurVocabulaire => 'entryId' in error && error.direction === direction
		);
		const replayEntries = matchingErrors
			.map((error) => VOCABULARY.find((entry) => entry.id === error.entryId))
			.filter((entry): entry is VocabularyEntry => entry !== undefined);
		if (replayEntries.length === 0) {
			sessionError = 'Les cartes de cette partie ne sont plus disponibles.';
			return;
		}

		resetStudy();
		sessionEntries = replayEntries;
		activePool = fixedTheme
			? VOCABULARY.filter((entry) => entry.theme === fixedTheme)
			: [...VOCABULARY];
		sessionTheme = 'Erreurs à revoir';
		sessionSection = null;
		sessionSize = replayEntries.length;
		answerMode = matchingErrors[0]?.mode ?? 'self-assessment';
		if (answerMode === 'multiple-choice' && !canUseMultipleChoice(activePool, direction)) {
			answerMode = 'self-assessment';
		}
		sessionError = '';
	}

	function restart() {
		if (!sessionTheme || sessionSize < 1) return;
		const sectionChoice = sessionSection ?? ALL_SECTIONS;
		try {
			applySession(
				createVocabularySession(sessionTheme, sectionChoice, direction, sessionSize),
				sessionSize
			);
		} catch {
			startStudy();
		}
	}

	onMount(() => {
		selectedTheme = fixedTheme ?? THEMES[0] ?? '';
		const replay = takeReplay(moduleForDirection());
		if (replay) {
			startReplay(replay);
			return;
		}
		startStudy();
	});
</script>

{#snippet answerModeToggle()}
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
			disabled={!qcmAvailable}
			title={qcmAvailable
				? undefined
				: 'Cette sélection ne permet pas trois distracteurs distincts.'}
			onclick={() => setAnswerMode('multiple-choice')}
		>
			QCM
		</button>
	</div>
{/snippet}

<section class="study-shell" aria-labelledby="study-title">
	<header class="study-heading">
		<div>
			<p class="eyebrow">{fixedTheme ?? 'Vocabulaire'} · {directionLabel}</p>
			<h1 id="study-title">{pageTitle}</h1>
		</div>
		<p class="theme-total">
			{#if entries.length}
				{entries.length} cartes dans la série · {activePool.length} disponibles
			{:else}
				Jusqu’à {maximumAvailable} cartes distinctes
			{/if}
		</p>
	</header>

	<div class="study-controls" class:has-direction-controls={onDirectionChange}>
		{#if onDirectionChange}
			<div class="toggle-row">
				<div class="toggle-field">
					<span class="toggle-label">Sens des cartes</span>
					<div class="mode-control" role="group" aria-label="Sens des cartes">
						<button
							type="button"
							class:active={direction === 'word-to-definition'}
							aria-pressed={direction === 'word-to-definition'}
							onclick={() => onDirectionChange('word-to-definition')}
						>
							{fixedTheme ? 'Expression → définition' : 'Mot → définition'}
						</button>
						<button
							type="button"
							class:active={direction === 'definition-to-word'}
							aria-pressed={direction === 'definition-to-word'}
							onclick={() => onDirectionChange('definition-to-word')}
						>
							{fixedTheme ? 'Définition → expression' : 'Définition → mot'}
						</button>
					</div>
				</div>
				{@render answerModeToggle()}
			</div>
		{/if}
		<div class="filter-row">
			{#if !fixedTheme}
				<label class="filter-control theme-filter" for="vocabulary-theme">
					<span>Thème</span>
					<select id="vocabulary-theme" bind:value={selectedTheme} onchange={changeTheme}>
						<option value={RANDOM_THEME}>Thème aléatoire</option>
						{#each THEMES as theme (theme)}
							<option value={theme}>{theme}</option>
						{/each}
					</select>
				</label>
				<label class="filter-control section-filter" for="vocabulary-section">
					<span>Section</span>
					<select id="vocabulary-section" bind:value={selectedSection} onchange={startStudy}>
						<option value={ALL_SECTIONS}>Toutes les sections</option>
						<option value={RANDOM_SECTION}>Section aléatoire</option>
						{#each availableSections as section (section)}
							<option value={section}>{section}</option>
						{/each}
					</select>
				</label>
			{/if}
			<label class="filter-control cards-filter" for="vocabulary-length">
				<span>Cartes par série</span>
				<select id="vocabulary-length" bind:value={selectedLength} onchange={startStudy}>
					<option value="5">5</option>
					<option value="10">10</option>
					<option value="15">15</option>
					<option value="custom">Personnalisé</option>
				</select>
			</label>
			{#if selectedLength === 'custom'}
				<label class="filter-control custom-length" for="vocabulary-custom-length">
					<span>Nombre de cartes</span>
					<input
						id="vocabulary-custom-length"
						aria-label="Nombre de cartes personnalisé"
						type="number"
						min="1"
						step="1"
						bind:value={customLength}
						oninput={(event) => {
							customLength = event.currentTarget.valueAsNumber;
							startStudy();
						}}
					/>
				</label>
			{/if}
			{#if !onDirectionChange}{@render answerModeToggle()}{/if}
		</div>
	</div>
	<p class="availability-note">
		Maximum de la sélection : {maximumAvailable} cartes distinctes.
	</p>
	{#if activePool.length > 0 && !qcmAvailable}
		<p class="availability-note" role="status">
			Le QCM est indisponible : il faut trois réponses incorrectes distinctes.
		</p>
	{/if}

	{#if seriesComplete}
		<section class="completion-panel" aria-labelledby="completion-title">
			<p class="eyebrow">{sessionTheme}{sessionSection ? ` · ${sessionSection}` : ''}</p>
			<h2 id="completion-title">Série terminée</h2>
			<p class="completion-result" role="status">
				{#if answerMode === 'self-assessment'}
					{knownCount} acquis · {reviewCount} à revoir
				{:else}
					{correctCount} bonnes réponses · {incorrectCount} à revoir
				{/if}
			</p>
			{#if persistenceError}<p class="session-error" role="alert">{persistenceError}</p>{/if}
			<button class="primary-button" type="button" onclick={restart}>Recommencer</button>
		</section>
	{:else if sessionError}
		<p class="session-error" role="alert">{sessionError}</p>
	{:else if card && currentEntry}
		<div class="progress-heading">
			<span>Carte {currentIndex + 1} / {sessionEntries.length}</span>
			<span>{sessionTheme}{sessionSection ? ` · ${sessionSection}` : ''}</span>
		</div>
		<progress aria-label="Progression" max={sessionEntries.length} value={currentIndex + 1}
		></progress>

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
						<p>
							{direction === 'word-to-definition'
								? 'Définition'
								: fixedTheme
									? 'Expression'
									: 'Mot'}
						</p>
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
					Cette sélection ne contient pas assez de réponses distinctes pour un QCM.
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
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.study-controls.has-direction-controls {
		display: grid;
		gap: 1.35rem;
	}

	.toggle-row {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.toggle-field {
		display: grid;
		gap: 0.5rem;
	}

	.toggle-label {
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 800;
	}

	.study-controls.has-direction-controls .filter-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.study-controls:not(.has-direction-controls) .filter-row {
		display: contents;
	}

	.filter-control {
		min-width: min(100%, 14rem);
		flex: 1 1 14rem;
		display: grid;
		gap: 0.5rem;
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 800;
	}

	select,
	input {
		min-width: 0;
		width: 100%;
		min-height: 2.9rem;
		padding: 0 2.5rem 0 0.85rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #f7f8f2;
		color: #182c25;
		font-size: 0.88rem;
		font-weight: 600;
	}

	.availability-note {
		margin: -1.25rem 0 1.5rem;
		color: #60756a;
		font-size: 0.76rem;
	}

	.session-error {
		margin: 1.5rem 0;
		padding: 1rem 1.1rem;
		border-left: 3px solid #d84831;
		background: #fae8e1;
		color: #6d2418;
		font-weight: 700;
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

	.mode-control button:disabled {
		cursor: not-allowed;
		opacity: 0.48;
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

		.study-controls.has-direction-controls .toggle-row,
		.study-controls.has-direction-controls .filter-row {
			align-items: stretch;
			flex-direction: column;
		}

		.filter-control {
			flex: none;
			width: 100%;
		}

		.theme-filter,
		.section-filter,
		.cards-filter {
			max-width: 18rem;
		}

		select {
			height: 2.75rem;
			min-height: 2.75rem;
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
