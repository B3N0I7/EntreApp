<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const activities = [
		{
			number: '01',
			title: 'Vocabulaire',
			description:
				'Révise les mots et leurs définitions dans les deux sens, en révélation ou en QCM.',
			href: '/vocabulaire'
		},
		{
			number: '02',
			title: 'Expressions françaises',
			description: 'Explore les expressions et retrouve leur définition ou leur formulation.',
			href: '/expressions'
		},
		{
			number: '03',
			title: 'Conjugaison',
			description: 'Entraîne-toi sur 30 verbes et six temps avec une correction progressive.',
			href: '/conjugaison'
		}
	] as const;

	let userRole = $derived(page.data.user?.role ?? 'guest');
	let userName = $derived(page.data.user?.name ?? 'Invité');
	let roleLabel = $derived(
		userRole === 'admin' ? 'Administration' : userRole === 'student' ? 'Élève' : 'Invité'
	);
</script>

<svelte:head>
	<title>Objectif B1 · Pratique du français</title>
	<meta
		name="description"
		content="Retrouve les activités de vocabulaire, expressions françaises et conjugaison de ton espace Objectif B1."
	/>
</svelte:head>

<main class="overview-page">
	<section class="welcome" aria-labelledby="welcome-title">
		<div class="welcome-copy">
			<p class="eyebrow">Espace de pratique · Français B1</p>
			<h1 id="welcome-title">Objectif B1</h1>
			<p>Bonjour {userName}. Choisis une activité pour poursuivre ton entraînement.</p>
		</div>
		<div class="session-label" aria-label="Session active">
			<span>{roleLabel}</span>
			<strong>{userName}</strong>
		</div>
	</section>

	<section class="activities-section" aria-labelledby="activities-title">
		<header class="section-heading">
			<div>
				<p class="eyebrow">À pratiquer</p>
				<h2 id="activities-title">Les activités</h2>
			</div>
			<span class="activity-count">03 modules</span>
		</header>

		<div class="activity-grid">
			{#each activities as activity (activity.href)}
				<a class="activity-link" href={resolve(activity.href)}>
					<span class="activity-number">{activity.number}</span>
					<div class="activity-copy">
						<h3>{activity.title}</h3>
						<p>{activity.description}</p>
					</div>
					<span class="activity-arrow" aria-hidden="true">↗</span>
				</a>
			{/each}
		</div>
	</section>

	{#if userRole === 'admin' || userRole === 'student'}
		<section class="account-section" aria-labelledby="account-title">
			<header class="section-heading">
				<div>
					<p class="eyebrow">Espace personnel</p>
					<h2 id="account-title">Autres outils</h2>
				</div>
			</header>
			<div class="tool-links">
				<a href={resolve('/historique')}>
					<span>Historique</span>
					<span>Retrouve tes parties et reprends les erreurs.</span>
					<span class="activity-arrow" aria-hidden="true">↗</span>
				</a>
				{#if userRole === 'admin'}
					<a href={resolve('/tirage')}>
						<span>Tirage au sort</span>
						<span>Fais participer le groupe à tour de rôle.</span>
						<span class="activity-arrow" aria-hidden="true">↗</span>
					</a>
					<a href={resolve('/admin')}>
						<span>Administration</span>
						<span>Gère les comptes et les codes PIN.</span>
						<span class="activity-arrow" aria-hidden="true">↗</span>
					</a>
				{/if}
			</div>
		</section>
	{:else}
		<p class="guest-note">Les activités en mode invité ne sont pas enregistrées.</p>
	{/if}
</main>

<style>
	.overview-page {
		max-width: 76rem;
		margin: 0 auto;
		padding: clamp(2rem, 6vh, 4.5rem) clamp(1.25rem, 6vw, 6.5rem) 5rem;
	}

	.welcome,
	.section-heading {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1.5rem;
	}

	.welcome {
		padding-bottom: 2rem;
		border-bottom: 1px solid #ccd7ce;
	}

	.welcome-copy {
		max-width: 42rem;
	}

	.eyebrow {
		margin: 0 0 0.55rem;
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
		margin-bottom: 0.8rem;
		font-size: 4rem;
		line-height: 1;
	}

	.welcome-copy > p:last-child {
		margin-bottom: 0;
		color: #52665b;
		font-size: 0.95rem;
		line-height: 1.55;
	}

	.session-label {
		min-width: 11rem;
		display: grid;
		gap: 0.35rem;
		padding: 0.35rem 0 0.35rem 1rem;
		border-left: 3px solid #f15d43;
		color: #60756a;
		font-size: 0.72rem;
	}

	.session-label strong {
		color: #182c25;
		font-size: 0.95rem;
	}

	.activities-section,
	.account-section {
		margin-top: 2.5rem;
	}

	.section-heading {
		margin-bottom: 1rem;
	}

	.section-heading .eyebrow {
		margin-bottom: 0.35rem;
	}

	h2 {
		margin-bottom: 0;
		font-size: 1.8rem;
	}

	.activity-count {
		padding-bottom: 0.2rem;
		color: #60756a;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.activity-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1rem;
	}

	.activity-link {
		min-width: 0;
		min-height: 12rem;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: start;
		gap: 0.9rem;
		padding: 1.1rem 0.85rem 1rem;
		border-top: 2px solid #173b30;
		border-bottom: 1px solid #ccd7ce;
		color: inherit;
		text-decoration: none;
		transition:
			border-color 150ms ease,
			background 150ms ease;
	}

	.activity-link:hover {
		border-top-color: #f15d43;
		background: rgb(255 255 255 / 0.35);
	}

	.activity-link:focus-visible,
	.tool-links a:focus-visible {
		outline: 3px solid #173b30;
		outline-offset: 3px;
	}

	.activity-number {
		padding-top: 0.2rem;
		color: #d84831;
		font-size: 0.7rem;
		font-weight: 800;
		font-variant-numeric: tabular-nums;
	}

	.activity-copy {
		min-width: 0;
	}

	h3 {
		margin-bottom: 0.55rem;
		font-size: 1.35rem;
		line-height: 1.2;
	}

	.activity-copy p {
		margin-bottom: 0;
		color: #52665b;
		font-size: 0.84rem;
		line-height: 1.55;
	}

	.activity-arrow {
		color: #d84831;
		font-size: 1rem;
		font-weight: 700;
	}

	.account-section {
		padding-top: 0.25rem;
	}

	.tool-links {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		border-top: 1px solid #ccd7ce;
	}

	.tool-links a {
		min-width: 0;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.4rem 1rem;
		padding: 1rem 1rem 1rem 0;
		border-bottom: 1px solid #ccd7ce;
		color: inherit;
		text-decoration: none;
	}

	.tool-links a > span:first-child {
		font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
		font-size: 1.2rem;
	}

	.tool-links a > span:nth-child(2) {
		grid-column: 1;
		color: #52665b;
		font-size: 0.8rem;
		line-height: 1.45;
	}

	.tool-links a > span:last-child {
		grid-column: 2;
		grid-row: 1 / span 2;
		align-self: center;
	}

	.tool-links a:hover > span:first-child {
		color: #d84831;
	}

	.guest-note {
		margin: 2rem 0 0;
		padding: 0.75rem 1rem;
		border-left: 3px solid #f15d43;
		color: #52665b;
		font-size: 0.82rem;
	}

	@media (max-width: 760px) {
		.welcome {
			align-items: flex-start;
			flex-direction: column;
		}

		.session-label {
			min-width: 0;
		}

		.activity-grid {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.activity-link {
			min-height: 8rem;
		}
	}

	@media (max-width: 420px) {
		h1 {
			font-size: 3.2rem;
		}

		.activity-link {
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 0.65rem;
		}
	}
</style>
