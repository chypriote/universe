<script lang="ts">
	import { cn } from '../utils.js';
	import { getUiLabels } from '../ui-labels.js';

	type Link = { key: string; href: string; label: string };

	let {
		current,
		links
	}: {
		current: string;
		/** `href` already resolved by the app (`resolve('/wishlist')`). */
		links: Link[];
	} = $props();

	const ui = getUiLabels();
</script>

<nav
	aria-label={ui().lists}
	class="inline-flex gap-0.5 rounded-control bg-card p-1 shadow-(--shadow-raised)"
>
	{#each links as link (link.key)}
		<a
			href={link.href}
			aria-current={current === link.key ? 'page' : undefined}
			class={cn(
				'inline-flex min-h-11 font-display [text-transform:var(--display-transform)] items-center rounded-control px-5 text-sm leading-tight font-bold tracking-label outline-ring focus-visible:outline-3 focus-visible:outline-solid',
				current === link.key
					? 'bg-primary text-primary-foreground'
					: 'bg-transparent text-foreground'
			)}
		>
			{link.label}
		</a>
	{/each}
</nav>
