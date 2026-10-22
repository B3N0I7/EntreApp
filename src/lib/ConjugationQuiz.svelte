<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { tick } from 'svelte';
	import { takeReplay } from './replay';
	import { enregistrerPartie, type ErreurConjugaison } from './sheetService';
	import {
		chooseConjugationPair,
		getAcceptedAnswers,
		getPronouns,
		getVerb,
		isCorrectConjugation,
		TENSES,
		VERBS,
		type Person,
		type PairSelection,
		type TenseId
	} from './conjugation';

	let verbChoice = $state('random');
	let tenseChoice = $state<'random' | TenseId>('random');
	let usedPairs = $state<string[]>([]);
	let session = $state<PairSelection | null>(null);
	let personIndex = $state(0);
	let answer = $state('');
	let feedback = $state<{ correct: boolean; answers: string[] } | null>(null);
	let correctCount = $state(0);
	let sessionComplete = $state(false);
	let answerInput = $state<HTMLInputElement>();
	let replayPersons = $state<Person[] | null>(null);
	let sessionErrors = $state<ErreurConjugaison[]>([]);
	let completionRecorded = $state(false);
	let persistenceError = $state('');
	let sessionError = $state('');

	let verb = $derived(session ? getVerb(session.verbId) : undefined);
	let tenseId = $derived(session?.tenseId);
	let tense = $derived(tenseId ? TENSES.find((candidate) => candidate.id === tenseId) : undefined);
	let pronouns = $derived(verb && tenseId ? getPronouns(verb, tenseId) : []);
	let questionPersons = $derived(replayPersons ?? pronouns);
	let questionCount = $derived(questionPersons.length);
	let person = $derived(questionPersons[personIndex]);
	let acceptedAnswers = $derived(
		verb && tenseId && person ? getAcceptedAnswers(verb, tenseId, person) : []
	);
	let candidatePairCount = $derived(
		(verbChoice === 'random' ? VERBS.length : 1) * (tenseChoice === 'random' ? TENSES.length : 1)
	);

	function resetFilters() {
		usedPairs = [];
	}

	function startSession() {
		if (
			(verbChoice === 'random' || tenseChoice === 'random') &&
			usedPairs.length >= candidatePairCount
		) {
			usedPairs = [];
		}

		const selection = chooseConjugationPair(
			verbChoice === 'random' ? null : verbChoice,
			tenseChoice === 'random' ? null : tenseChoice,
			new Set(usedPairs)
		);
		session = selection;
		if (verbChoice === 'random' || tenseChoice === 'random') {
			usedPairs = [...usedPairs, `${selection.verbId}:${selection.tenseId}`];
		}
		personIndex = 0;
		answer = '';
		feedback = null;
		correctCount = 0;
		sessionComplete = false;
		replayPersons = null;
		sessionErrors = [];
		completionRecorded = false;
		persistenceError = '';
		sessionError = '';
	}

	function submitStart(event: SubmitEvent) {
		event.preventDefault();
		startSession();
	}

	function submitAnswer(event: SubmitEvent) {
		event.preventDefault();
		if (feedback || !person || !answer.trim()) return;
		const correct = isCorrectConjugation(answer, acceptedAnswers);
		feedback = { correct, answers: acceptedAnswers };
		if (correct) correctCount += 1;
		else if (verb && tense && person) {
			sessionErrors = [
				...sessionErrors,
				{
					verbeId: verb.id,
					tempsId: tense.id,
					verbe: verb.infinitive,
					temps: tense.label,
					pronom: person,
					reponseEleve: answer.trim(),
					correction: acceptedAnswers
				}
			];
		}
	}

	async function moveToNextPerson() {
		if (personIndex >= questionCount - 1) {
			await completeSession();
			return;
		}
		personIndex += 1;
		answer = '';
		feedback = null;
		await tick();
		answerInput?.focus();
	}

	async function completeSession() {
		sessionComplete = true;
		if (completionRecorded || !session || questionCount === 0) return;
		completionRecorded = true;
		try {
			await enregistrerPartie('conjugaison', `${correctCount}/${questionCount}`, sessionErrors);
		} catch {
			persistenceError = 'La série est terminée, mais son enregistrement a échoué.';
		}
	}

	function startReplay(errors: import('./sheetService').Erreur[]) {
		const conjugationErrors = errors.filter(
			(error): error is ErreurConjugaison => 'verbeId' in error && 'tempsId' in error
		);
		const firstError = conjugationErrors[0];
		const replayVerb = firstError ? getVerb(firstError.verbeId) : undefined;
		const replayTense = firstError
			? TENSES.find((candidate) => candidate.id === firstError.tempsId)
			: undefined;
		if (!firstError || !replayVerb || !replayTense) {
			sessionError = 'Les questions de cette série ne sont plus disponibles.';
			return;
		}

		const availablePersons = getPronouns(replayVerb, replayTense.id);
		const targets = [
			...new Set(
				conjugationErrors
					.filter((error) => error.verbeId === replayVerb.id && error.tempsId === replayTense.id)
					.map((error) => error.pronom)
			)
		].filter((pronoun): pronoun is Person => availablePersons.includes(pronoun as Person));
		if (targets.length === 0) {
			sessionError = 'Aucun pronom à rejouer n’est disponible.';
			return;
		}

		session = { verbId: replayVerb.id, tenseId: replayTense.id };
		verbChoice = replayVerb.id;
		tenseChoice = replayTense.id;
		replayPersons = targets;
		personIndex = 0;
		answer = '';
		feedback = null;
		correctCount = 0;
		sessionErrors = [];
		sessionComplete = false;
		completionRecorded = false;
		persistenceError = '';
		sessionError = '';
	}

	onMount(() => {
		if (page.url.searchParams.get('replay') === '1') {
			const replay = takeReplay('conjugaison');
			if (replay) {
				startReplay(replay);
				return;
			}
		}
	});
</script>

<svelte:head>
	<title>Conjugaison · Atelier</title>
	<meta name="description" content="Entraîne-toi à conjuguer 30 verbes français à six temps." />
</svelte:head>

<main class="quiz-shell">
	<header class="page-heading">
		<div>
			<p class="eyebrow">30 verbes · 6 temps</p>
			<h1>Conjugaison</h1>
		</div>
		<p class="heading-note">Une forme à la fois</p>
	</header>

	<form class="selection-panel" onsubmit={submitStart}>
		<label for="verb-choice">
			<span>Verbe</span>
			<select id="verb-choice" bind:value={verbChoice} onchange={resetFilters}>
				<option value="random">Au hasard</option>
				{#each VERBS as item (item.id)}
					<option value={item.id}>{item.infinitive}</option>
				{/each}
			</select>
		</label>

		<label for="tense-choice">
			<span>Temps</span>
			<select id="tense-choice" bind:value={tenseChoice} onchange={resetFilters}>
				<option value="random">Au hasard</option>
				{#each TENSES as item (item.id)}
					<option value={item.id}>{item.label}</option>
				{/each}
			</select>
		</label>

		<button class="start-button" type="submit">
			{session ? 'Nouvelle série' : 'Commencer'}
			<span aria-hidden="true">↗</span>
		</button>
	</form>
	{#if sessionError}<p class="session-error" role="alert">{sessionError}</p>{/if}

	{#if session && verb && tense}
		{#if sessionComplete}
			<section class="completion-panel" aria-labelledby="completion-title">
				<p class="eyebrow">{verb.infinitive} · {tense.label}</p>
				<h2 id="completion-title">Série terminée</h2>
				<p class="score" role="status">
					{correctCount} / {questionCount} réponses correctes
				</p>
				{#if persistenceError}<p class="session-error" role="alert">{persistenceError}</p>{/if}
				<button class="start-button" type="button" onclick={startSession}>Nouvelle série</button>
			</section>
		{:else if person}
			<section class="question-section" aria-labelledby="question-title">
				<div class="question-meta">
					<div>
						<p class="eyebrow">{tense.label}</p>
						<h2 id="question-title">{verb.infinitive}</h2>
					</div>
					<p class="progress-count">{personIndex + 1} / {questionCount}</p>
				</div>

				<progress aria-label="Progression de la série" max={questionCount} value={personIndex + 1}
				></progress>

				<div class="question-card">
					{#if verb.impersonal}
						<p class="grammar-note">Verbe impersonnel · seule la forme « il » est utilisée.</p>
					{/if}
					<p class="person-label">Pronom</p>
					<p class="person">{person}</p>

					{#if feedback}
						<div class="feedback" class:correct={feedback.correct} role="status" aria-live="polite">
							<strong>{feedback.correct ? 'Correct' : 'À revoir'}</strong>
							<span>{feedback.answers.join(' / ')}</span>
						</div>
						<button class="next-button" type="button" onclick={moveToNextPerson}>
							{personIndex === questionCount - 1 ? 'Voir le résultat' : 'Pronom suivant'}
						</button>
					{:else}
						<form class="answer-form" onsubmit={submitAnswer}>
							<label for="conjugation-answer">Forme conjuguée complète</label>
							<div class="answer-row">
								<input
									id="conjugation-answer"
									bind:this={answerInput}
									bind:value={answer}
									autocomplete="off"
									spellcheck="false"
									aria-label={`Conjugaison de ${verb.infinitive} avec ${person}`}
									placeholder={`${person} …`}
									required
								/>
								<button class="next-button" type="submit">Vérifier</button>
							</div>
						</form>
					{/if}
				</div>

				{#if verb.notes.length > 0}
					<details class="verb-notes">
						<summary>Définition et exemples du verbe</summary>
						<ul>
							{#each verb.notes as note (note)}
								<li>{note}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</section>
		{/if}
	{/if}
</main>

<style>
	.quiz-shell {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2.5rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.page-heading,
	.question-meta {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
	}

	.page-heading {
		margin-bottom: 2rem;
	}

	.eyebrow {
		margin: 0 0 0.65rem;
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

	.heading-note,
	.progress-count {
		margin: 0 0 0.4rem;
		color: #60756a;
		font-size: 0.8rem;
		font-weight: 700;
	}

	.selection-panel {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
		align-items: end;
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1.25rem;
		background: #f7f8f2;
	}

	.selection-panel label {
		display: grid;
		gap: 0.45rem;
		color: #60756a;
		font-size: 0.74rem;
		font-weight: 800;
	}

	select {
		width: 100%;
		min-height: 2.9rem;
		padding: 0 0.8rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #fff;
		color: #182c25;
		font-size: 0.9rem;
	}

	.start-button,
	.next-button {
		min-height: 2.9rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
		padding: 0.75rem 1rem;
		border: 0;
		background: #173b30;
		color: #f3f5e9;
		font-size: 0.86rem;
		font-weight: 800;
		cursor: pointer;
	}

	.start-button:hover,
	.next-button:hover {
		background: #245342;
	}

	select:focus-visible,
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 3px solid #f15d43;
		outline-offset: 3px;
	}

	.question-section {
		max-width: 55rem;
		margin: 0 auto;
	}

	.question-meta {
		margin-bottom: 0.6rem;
	}

	.question-meta h2 {
		margin: 0;
		font-size: 2.1rem;
	}

	progress {
		width: 100%;
		height: 0.3rem;
		display: block;
		margin-bottom: 1.1rem;
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

	.question-card,
	.completion-panel {
		min-height: 22rem;
		padding: clamp(1.5rem, 5vw, 3.5rem);
		background: #f7f8f2;
		box-shadow: 0.55rem 0.55rem 0 #d3dfd2;
	}

	.grammar-note {
		margin: 0 0 1.75rem;
		padding: 0.8rem 1rem;
		border-left: 3px solid #f15d43;
		background: #fffaf0;
		color: #52665b;
		font-size: 0.84rem;
	}

	.person-label {
		margin: 0 0 0.35rem;
		color: #19866a;
		font-size: 0.72rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.person {
		margin: 0 0 2rem;
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 4.5rem;
		line-height: 1;
	}

	.answer-form label {
		display: block;
		margin-bottom: 0.5rem;
		color: #60756a;
		font-size: 0.74rem;
		font-weight: 800;
	}

	.answer-row {
		display: flex;
		gap: 0.65rem;
	}

	.answer-row input {
		width: 100%;
		min-width: 0;
		min-height: 3rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid #bdcbc0;
		border-radius: 0;
		background: #fff;
		color: #182c25;
		font-size: 1rem;
	}

	.feedback {
		display: grid;
		gap: 0.4rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
		line-height: 1.55;
	}

	.feedback strong {
		color: #bd452f;
	}

	.feedback.correct strong {
		color: #19866a;
	}

	.feedback span {
		overflow-wrap: anywhere;
	}

	.verb-notes {
		margin-top: 1.2rem;
		color: #52665b;
		font-size: 0.84rem;
		line-height: 1.55;
	}

	.verb-notes summary {
		width: fit-content;
		color: #173b30;
		font-weight: 700;
		cursor: pointer;
	}

	.verb-notes ul {
		padding-left: 1.2rem;
	}

	.verb-notes li + li {
		margin-top: 0.45rem;
	}

	.completion-panel {
		max-width: 55rem;
		min-height: 17rem;
		margin: 0 auto;
	}

	.completion-panel h2 {
		margin: 0 0 0.7rem;
		font-size: 3rem;
	}

	.score {
		margin: 0 0 1.3rem;
		color: #52665b;
	}

	@media (max-width: 760px) {
		.quiz-shell {
			padding-top: 2.5rem;
		}

		h1 {
			font-size: 3.6rem;
		}

		.selection-panel {
			grid-template-columns: 1fr;
		}

		.start-button {
			justify-self: start;
		}
	}

	@media (max-width: 420px) {
		.quiz-shell {
			padding: 2rem 1rem 3rem;
		}

		h1 {
			font-size: 2.8rem;
		}

		.heading-note {
			font-size: 0.7rem;
		}

		.question-card,
		.completion-panel {
			min-height: 18rem;
			padding: 1.25rem;
		}

		.person {
			font-size: 3.6rem;
		}

		.answer-row {
			align-items: stretch;
			flex-direction: column;
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
