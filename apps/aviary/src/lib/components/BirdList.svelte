<script lang="ts">
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
	import BirdTileCard from './BirdTile.svelte';

	type Option = { id: number; name: string };
	type Filters = { habitat?: number; song?: number; nest: 'all' | 'only' | 'not'; search: string };

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
	let nest = $state<string>(untrack(() => filters.nest));

	const searchActive = $derived(search.trim() !== '');
	const filtersActive = $derived(habitat !== '' || song !== '' || nest !== 'all');
	const isFiltering = $derived(searchActive || filtersActive);

	function queryOf(
		searchValue: string,
		habitatValue: string | number | undefined,
		songValue: string | number | undefined,
		nestValue: string
	) {
		const params = new SvelteURLSearchParams();
		if (searchValue.trim()) params.set('search', searchValue.trim());
		if (habitatValue) params.set('habitat', String(habitatValue));
		if (songValue) params.set('song', String(songValue));
		if (nestValue !== 'all') params.set('nest', nestValue);
		return params.toString();
	}

	function apply() {
		const query = queryOf(search, habitat, song, nest);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, new query
		void goto(`${page.url.pathname}${query ? `?${query}` : ''}`, {
			replace: true,
			reset: false
		});
	}

	// A change of any field reloads the tab; typing waits a moment.
	let applied = $state(
		untrack(() => queryOf(filters.search, filters.habitat, filters.song, filters.nest))
	);
	$effect(() => {
		const wanted = queryOf(search, habitat, song, nest);
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
		nest = 'all';
	}

	const all = (codeName: string) => [{ value: '', label: label(labels, codeName) }];
	const options = (list: Option[]) => list.map((o) => ({ value: String(o.id), label: o.name }));
	const nestOptions = $derived([
		{ value: 'all', label: label(labels, 'NestAll') },
		{ value: 'only', label: label(labels, 'NestOnly') },
		{ value: 'not', label: label(labels, 'NestNot') }
	]);

	const appLabel = $derived(label(labels, 'Aviary'));
	const viewLabel = $derived(
		label(labels, { aloft: 'Aloft', grounded: 'Grounded', nest: 'Nest' }[view])
	);
</script>

<svelte:head><title>{appLabel} | {viewLabel}</title></svelte:head>

<StickyBar current={view} links={lists(labels)} {searchActive} {filtersActive}>
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
		<Select bind:value={nest} label={label(labels, 'Nest')} options={nestOptions} />
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
				<BirdTileCard {bird} {labels} />
			{/each}
		</TileGrid>
	{/if}
</main>
