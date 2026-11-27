<script lang="ts">
	import AdminLink from './AdminLink.svelte';
	import EmptyState from '@universe/showcase/components/EmptyState.svelte';
	import StickyBar from '@universe/showcase/components/StickyBar.svelte';
	import TileGrid from '@universe/showcase/components/TileGrid.svelte';
	import { label, type Labels } from '#lib/labels';
	import { lists } from '#lib/lists';
	import type { BirdTile, BirdView } from '#lib/server/catalog/types';
	import BirdPopup from './BirdPopup.svelte';
	import BirdTileCard from './BirdTile.svelte';
	import { invalidateAll } from '$app/navigation';

	let { view, birds, labels }: { view: BirdView; birds: BirdTile[]; labels: Labels } = $props();

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
		label(labels, { aloft: 'Aloft', grounded: 'Grounded', nest: 'Nest' }[view])
	);
</script>

<svelte:head><title>{appLabel} | {viewLabel}</title></svelte:head>

<StickyBar current={view} links={lists(labels)}>
	{#snippet login()}<AdminLink label={label(labels, 'Admin')} />{/snippet}
	{#snippet title()}{appLabel}<span class="text-icon-accent">.</span>{/snippet}
</StickyBar>

<main id="main">
	{#if birds.length === 0}
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
