<script lang="ts">
	import AddBird from './AddBird.svelte';
	import { untrack } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AdminLink from './AdminLink.svelte';
	import Button from '@universe/showcase/components/Button.svelte';
	import EmptyState from '@universe/showcase/components/EmptyState.svelte';
	import SearchField from '@universe/showcase/components/SearchField.svelte';
	import Select from '@universe/showcase/components/Select.svelte';
	import StickyBar from '@universe/showcase/components/StickyBar.svelte';
	import TileGrid from '@universe/showcase/components/TileGrid.svelte';
	import { label, type Labels } from '#lib/labels';
	import { lists } from '#lib/lists';
	import type { BirdTile, BirdView } from '#lib/server/catalog/types';
	import BirdPopup from './BirdPopup.svelte';
	import BirdTileCard from './BirdTile.svelte';
	import { invalidateAll } from '$app/navigation';

	type Option = { id: number; name: string };
	type Filters = {
		habitat?: number;
		song?: number;
		seen: 'all' | 'only' | 'not';
		nest: 'all' | 'only' | 'not';
		roosted: 'all' | 'only';
		search: string;
	};

	let {
		view,
		birds,
		labels,
		filters,
		habitats,
		songs
	}: {
		view: BirdView;
		birds: BirdTile[];
		labels: Labels;
		filters: Filters;
		habitats: Option[];
		songs: Option[];
	} = $props();

	// The filters live in the URL so the server load applies them; the fields start from it.
	let search = $state(untrack(() => filters.search));
	let habitat = $state(untrack(() => String(filters.habitat ?? '')));
	let song = $state(untrack(() => String(filters.song ?? '')));
	let seen = $state<string>(untrack(() => filters.seen));
	let nest = $state<string>(untrack(() => filters.nest));
	let roosted = $state<string>(untrack(() => filters.roosted));

	const searchActive = $derived(search.trim() !== '');
	const filtersActive = $derived(
		habitat !== '' || song !== '' || seen !== 'all' || nest !== 'all' || roosted !== 'all'
	);
	const isFiltering = $derived(searchActive || filtersActive);

	function queryOf(
		searchValue: string,
		habitatValue: string | number | undefined,
		songValue: string | number | undefined,
		seenValue: string,
		nestValue: string,
		roostedValue: string
	) {
		const params = new SvelteURLSearchParams();
		if (searchValue.trim()) params.set('search', searchValue.trim());
		if (habitatValue) params.set('habitat', String(habitatValue));
		if (songValue) params.set('song', String(songValue));
		if (seenValue !== 'all') params.set('seen', seenValue);
		if (nestValue !== 'all') params.set('nest', nestValue);
		if (roostedValue !== 'all') params.set('roosted', roostedValue);
		return params.toString();
	}

	function apply() {
		const query = queryOf(search, habitat, song, seen, nest, roosted);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, new query
		void goto(`${page.url.pathname}${query ? `?${query}` : ''}`, {
			replace: true,
			reset: false
		});
	}

	// A change of any field reloads the tab; typing waits a moment.
	let applied = $state(
		untrack(() =>
			queryOf(
				filters.search,
				filters.habitat,
				filters.song,
				filters.seen,
				filters.nest,
				filters.roosted
			)
		)
	);
	$effect(() => {
		const wanted = queryOf(search, habitat, song, seen, nest, roosted);
		if (wanted === untrack(() => applied)) return;
		const timer = setTimeout(() => {
			applied = wanted;
			apply();
		}, 250);
		return () => clearTimeout(timer);
	});

	function clearFilters() {
		search = '';
		habitat = '';
		song = '';
		seen = 'all';
		nest = 'all';
		roosted = 'all';
	}

	const all = (codeName: string) => [{ value: '', label: label(labels, codeName) }];
	const options = (list: Option[]) => list.map((o) => ({ value: String(o.id), label: o.name }));
	const seenOptions = $derived([
		{ value: 'all', label: label(labels, 'SeenAll') },
		{ value: 'only', label: label(labels, 'SeenOnly') },
		{ value: 'not', label: label(labels, 'SeenNot') }
	]);
	const nestOptions = $derived([
		{ value: 'all', label: label(labels, 'NestAll') },
		{ value: 'only', label: label(labels, 'NestOnly') },
		{ value: 'not', label: label(labels, 'NestNot') }
	]);
	const roostedOptions = $derived([
		{ value: 'all', label: label(labels, 'RoostedAll') },
		{ value: 'only', label: label(labels, 'RoostedOnly') }
	]);

	let open = $state(false);
	let anchor = $state<HTMLElement | null>(null);
	let selectedId = $state<number | null>(null);
	const selected = $derived(birds.find((bird) => bird.id === selectedId) ?? null);

	function select(bird: BirdTile, el: HTMLElement) {
		selectedId = bird.id;
		anchor = el;
		open = true;
	}

	const appLabel = $derived(label(labels, 'Aviary'));
	const viewLabel = $derived(
		label(labels, { aloft: 'Aloft', grounded: 'Grounded', seen: 'Seen' }[view])
	);
</script>

<svelte:head><title>{appLabel} | {viewLabel}</title></svelte:head>

<StickyBar current={view} links={lists(labels)} {searchActive} {filtersActive}>
	{#snippet action()}<AddBird {labels} />{/snippet}
	{#snippet chips()}
		<span class="px-1 text-sm font-bold text-muted-foreground tabular-nums">
			<span class="sr-only">{viewLabel}</span>
			{birds.length}
		</span>
	{/snippet}
	{#snippet login()}<AdminLink label={label(labels, 'Admin')} />{/snippet}
	{#snippet title()}{appLabel}<span class="text-icon-accent">.</span>{/snippet}
	{#snippet searchBox()}
		<SearchField
			bind:value={search}
			label={label(labels, 'SearchBirds')}
			placeholder={label(labels, 'SearchBirds')}
		/>
	{/snippet}
	{#snippet controls()}
		<Select
			bind:value={habitat}
			label={label(labels, 'Habitat')}
			options={[...all('AllHabitats'), ...options(habitats)]}
		/>
		<Select
			bind:value={song}
			label={label(labels, 'Songs')}
			options={[...all('AllSongs'), ...options(songs)]}
		/>
		{#if view === 'seen'}
			<Select bind:value={nest} label={label(labels, 'Nest')} options={nestOptions} />
			<Select bind:value={roosted} label={label(labels, 'Roosted')} options={roostedOptions} />
		{:else}
			<Select bind:value={seen} label={label(labels, 'Seen')} options={seenOptions} />
		{/if}
	{/snippet}
</StickyBar>

<main id="main">
	{#if birds.length === 0 && isFiltering}
		<EmptyState message={label(labels, 'NoMatch')}>
			{#snippet action()}
				<Button onclick={clearFilters}>{label(labels, 'ClearFilters')}</Button>
			{/snippet}
		</EmptyState>
	{:else if birds.length === 0}
		<EmptyState message={label(labels, 'NoBirds')} />
	{:else}
		<TileGrid>
			{#each birds as bird (bird.id)}
				<BirdTileCard {bird} {labels} onSelect={(el) => select(bird, el)} />
			{/each}
		</TileGrid>
	{/if}
</main>

{#if selected}
	<BirdPopup
		bind:open
		{anchor}
		birdId={selected.id}
		name={selected.name}
		{labels}
		onChanged={() => invalidateAll()}
	/>
{/if}
