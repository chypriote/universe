<script lang="ts">
	import { cn } from '../utils.js';

	type Link = { key: string; href: string; label: string };

	let {
		current,
		links,
		variant = 'pills'
	}: {
		current: string;
		/** `href` already resolved by the app (`resolve('/wishlist')`). */
		links: Link[];
		/** `pills`: one raised pill per tab. `segmented`: the tabs share one raised track. */
		variant?: 'pills' | 'segmented';
	} = $props();
</script>

<nav
	aria-label="Lists"
	class={variant === 'segmented'
		? 'inline-flex gap-0.5 rounded-control bg-card p-1 shadow-(--shadow-raised)'
		: 'flex gap-2'}
>
	{#each links as link (link.key)}
		<a
			href={link.href}
			aria-current={current === link.key ? 'page' : undefined}
			class={cn(
				'display-type inline-flex min-h-11 items-center rounded-control px-5 text-sm leading-tight font-bold tracking-label outline-ring focus-visible:outline-3 focus-visible:outline-solid',
				variant === 'pills' && 'shadow-(--shadow-raised)',
				current === link.key
					? 'bg-primary text-primary-foreground'
					: variant === 'pills'
						? 'bg-card text-foreground'
						: 'bg-transparent text-foreground'
			)}
		>
			{link.label}
		</a>
	{/each}
</nav>
