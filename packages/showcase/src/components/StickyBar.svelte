<script lang="ts">
	import FilterIcon from '@lucide/svelte/icons/sliders-horizontal';
	import SearchIcon from '@lucide/svelte/icons/search';
	import type { Snippet } from 'svelte';
	import { Button } from './ui/button/index.js';
	import Tabs from './Tabs.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let {
		title,
		current,
		links,
		chips,
		login,
		action,
		searchBox,
		controls,
		searchActive = false,
		filtersActive = false
	}: {
		/** The page title, rendered inside the `<h1>`. */
		title: Snippet;
		current: string;
		/** The app's lists for Tabs, `href` already resolved. */
		links: { key: string; href: string; label: string }[];
		chips?: Snippet;
		/** LoginAction, in the title row. */
		login?: Snippet;
		/** Add button (Owner), next to the tabs. */
		action?: Snippet;
		/** SearchField. */
		searchBox?: Snippet;
		/** Filters, Selects, SortDirection. */
		controls?: Snippet;
		/** Show a dot on the closed toggle when a search or filter is set. */
		searchActive?: boolean;
		filtersActive?: boolean;
	} = $props();

	// Below `sm`, search and filters sit behind icon toggles; from `sm` up they are always shown.
	let panel = $state<'search' | 'filters' | null>(null);

	function toggle(next: 'search' | 'filters') {
		panel = panel === next ? null : next;
	}
</script>

{#snippet toggleButton(key: 'search' | 'filters', label: string, active: boolean)}
	<Button
		variant={panel === key ? 'default' : 'neutral'}
		size="icon"
		class="sm:hidden"
		aria-expanded={panel === key}
		onclick={() => toggle(key)}
	>
		{#if key === 'search'}
			<SearchIcon aria-hidden="true" class="size-4" />
		{:else}
			<FilterIcon aria-hidden="true" class="size-4" />
		{/if}
		<span class="sr-only">{label}</span>
		{#if active && panel !== key}
			<span aria-hidden="true" class="absolute end-1.5 top-1.5 size-2.5 rounded-full bg-icon-accent"
			></span>
		{/if}
	</Button>
{/snippet}

<header
	class="sticky top-0 z-(--layer-sticky) flex flex-col gap-3 bg-background pt-[max(0.75rem,env(safe-area-inset-top))] pe-[max(1rem,env(safe-area-inset-right))] pb-3 ps-[max(1rem,env(safe-area-inset-left))]"
>
	<div class="flex items-center justify-between gap-2 sm:flex-wrap sm:gap-x-3">
		<h1>{@render title()}</h1>
		<div class="flex items-center gap-1.5 sm:flex-wrap sm:gap-2">
			<div class="flex gap-1.5 sm:gap-2" aria-live="polite">
				{@render chips?.()}
			</div>
			{@render login?.()}
			<ThemeToggle />
		</div>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<Tabs {current} {links} />
		{@render action?.()}
		<div class="flex gap-2 sm:hidden">
			{@render toggleButton('search', 'Search', searchActive)}
			{@render toggleButton('filters', 'Filters and sort', filtersActive)}
		</div>
	</div>
	<div class="{panel ? 'flex' : 'hidden'} flex-wrap items-center gap-2 sm:flex">
		<div class={panel === 'search' ? 'contents' : 'hidden sm:contents'}>
			{@render searchBox?.()}
		</div>
		<div class={panel === 'filters' ? 'contents' : 'hidden sm:contents'}>
			{@render controls?.()}
		</div>
	</div>
</header>
