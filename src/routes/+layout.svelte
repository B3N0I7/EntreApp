<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	let menuOpen = $state(false);
	let menuButton: HTMLButtonElement | undefined;

	const links = [
		{ label: 'Tirage au sort', href: '/tirage' },
		{ label: 'Vocabulaire', href: '/vocabulaire' },
		{ label: 'Expressions françaises', href: '/expressions' },
		{ label: 'Conjugaison', href: '/conjugaison' }
	] as const;

	function isActiveLink(href: string) {
		return href === '/vocabulaire'
			? page.url.pathname === href || page.url.pathname.startsWith(`${href}/`)
			: page.url.pathname === href;
	}

	function shouldShowLink(href: string) {
		const role = page.data.user?.role;
		if (!role) return false;
		if (href === '/tirage') return role === 'admin';
		return true;
	}

	function closeMenu() {
		menuOpen = false;
	}

	async function logout() {
		const response = await fetch('/api/auth/logout', { method: 'POST' });
		if (response.ok) await goto(resolve('/login'), { invalidateAll: true });
		closeMenu();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && menuOpen) {
			closeMenu();
			menuButton?.focus();
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="site-shell">
	<header class="site-header">
		<a class="brand" href={resolve('/')} onclick={closeMenu} aria-label="Accueil">
			<span class="brand-mark" aria-hidden="true">B1</span>
			<span>Objectif B1</span>
		</a>

		<button
			class="menu-toggle"
			class:open={menuOpen}
			bind:this={menuButton}
			aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
			aria-expanded={menuOpen}
			aria-controls="main-navigation"
			type="button"
			onclick={() => (menuOpen = !menuOpen)}
		>
			<span></span>
			<span></span>
			<span></span>
		</button>

		<nav id="main-navigation" class:open={menuOpen} aria-label="Navigation principale">
			{#each links as link (link.href)}
				{#if shouldShowLink(link.href)}
					<a
						href={resolve(link.href)}
						class:active={isActiveLink(link.href)}
						aria-current={isActiveLink(link.href) ? 'page' : undefined}
						onclick={closeMenu}
					>
						{link.label}
					</a>
				{/if}
			{/each}
			{#if page.data.user && page.data.user.role !== 'guest'}
				<a
					href={resolve('/historique')}
					class:active={page.url.pathname.startsWith('/historique')}
					aria-current={page.url.pathname.startsWith('/historique') ? 'page' : undefined}
					onclick={closeMenu}>Historique</a
				>
				{#if page.data.user.role === 'admin'}
					<a
						href={resolve('/admin')}
						class:active={page.url.pathname.startsWith('/admin')}
						aria-current={page.url.pathname.startsWith('/admin') ? 'page' : undefined}
						onclick={closeMenu}>Administration</a
					>
				{/if}
				<span class="user-name">{page.data.user.name}</span>
				<button class="session-action" type="button" onclick={logout}>Déconnexion</button>
			{:else if page.data.user}
				<span class="user-name">Invité</span>
				<button class="session-action" type="button" onclick={logout}>Quitter</button>
			{:else}
				<a
					href={resolve('/login')}
					class:active={page.url.pathname === '/login'}
					aria-current={page.url.pathname === '/login' ? 'page' : undefined}
					onclick={closeMenu}>Connexion</a
				>
			{/if}
		</nav>
	</header>

	{@render children()}
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		background: #edf2ec;
		color: #182c25;
		font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
	}

	:global(button),
	:global(select) {
		font: inherit;
	}

	.site-shell {
		min-height: 100vh;
	}

	.site-header {
		position: relative;
		z-index: 2;
		max-width: 88rem;
		height: 5.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		margin: 0 auto;
		padding: 0 clamp(1.25rem, 6vw, 6.5rem);
		border-bottom: 1px solid #ccd7ce;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: inherit;
		font-size: 0.82rem;
		font-weight: 800;
		text-decoration: none;
	}

	.brand-mark {
		width: 2rem;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		background: #f15d43;
		color: #fffaf0;
	}

	nav {
		display: flex;
		align-items: center;
		gap: clamp(1rem, 3vw, 2.5rem);
	}

	nav a {
		position: relative;
		padding: 0.7rem 0;
		color: #52665b;
		font-size: 0.84rem;
		font-weight: 700;
		text-decoration: none;
		transition: color 150ms ease;
	}

	nav a:hover,
	nav a.active {
		color: #173b30;
	}

	.user-name {
		color: #173b30;
		font-size: 0.84rem;
		font-weight: 800;
	}

	.session-action {
		padding: 0.55rem 0.7rem;
		border: 1px solid #bdcbc0;
		background: transparent;
		color: #52665b;
		font-size: 0.8rem;
		font-weight: 700;
		cursor: pointer;
	}

	nav a.active::after {
		position: absolute;
		right: 0;
		bottom: 0.25rem;
		left: 0;
		height: 2px;
		background: #f15d43;
		content: '';
	}

	.menu-toggle {
		width: 2.75rem;
		aspect-ratio: 1;
		display: none;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		border: 1px solid #bdcbc0;
		background: transparent;
		color: #173b30;
		cursor: pointer;
	}

	.menu-toggle span {
		width: 1.1rem;
		height: 2px;
		background: currentColor;
		transition:
			transform 150ms ease,
			opacity 150ms ease;
	}

	.menu-toggle.open span:first-child {
		transform: translateY(0.4rem) rotate(45deg);
	}

	.menu-toggle.open span:nth-child(2) {
		opacity: 0;
	}

	.menu-toggle.open span:last-child {
		transform: translateY(-0.4rem) rotate(-45deg);
	}

	.menu-toggle:focus-visible,
	.session-action:focus-visible,
	nav a:focus-visible,
	.brand:focus-visible {
		outline: 3px solid #173b30;
		outline-offset: 4px;
	}

	@media (max-width: 760px) {
		.site-header {
			height: 4.75rem;
			padding-right: 1.25rem;
			padding-left: 1.25rem;
		}

		.menu-toggle {
			display: flex;
		}

		nav {
			position: absolute;
			top: calc(100% + 0.5rem);
			right: 1rem;
			left: 1rem;
			display: none;
			align-items: stretch;
			flex-direction: column;
			gap: 0;
			padding: 0.5rem 1rem;
			border: 1px solid #ccd7ce;
			background: #f7f8f2;
			box-shadow: 0 0.75rem 1.5rem rgb(24 44 37 / 0.12);
		}

		nav.open {
			display: flex;
		}

		nav a {
			padding: 0.95rem 0.25rem;
			border-bottom: 1px solid #dce4dc;
		}

		nav a:last-child {
			border-bottom: 0;
		}

		.user-name {
			padding: 0.95rem 0.25rem;
		}

		.session-action {
			align-self: flex-start;
			margin: 0.5rem 0.25rem;
		}

		nav a.active::after {
			right: auto;
			bottom: 0.55rem;
			left: 0.25rem;
			width: 2rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			transition-duration: 0.01ms !important;
		}
	}
</style>
