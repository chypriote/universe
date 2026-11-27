<script lang="ts">
	import EmptyState from '@universe/showcase/components/EmptyState.svelte';
	import StickyBar from '@universe/showcase/components/StickyBar.svelte';
	import TileGrid from '@universe/showcase/components/TileGrid.svelte';
	import { label, type Labels } from '#lib/labels';
	import { lists } from '#lib/lists';
	import type { BirdTile, BirdView } from '#lib/server/catalog/types';
	import BirdTileCard from './BirdTile.svelte';

	let { view, birds, labels }: { view: BirdView; birds: BirdTile[]; labels: Labels } = $props();

	const appLabel = $derived(label(labels, 'Aviary'));
	const viewLabel = $derived(
		label(labels, { aloft: 'Aloft', grounded: 'Grounded', nest: 'Nest' }[view])
	);
</script>

<svelte:head><title>{appLabel} | {viewLabel}</title></svelte:head>

<StickyBar current={view} links={lists(labels)}>
	{#snippet title()}{appLabel}<span class="text-icon-accent">.</span>{/snippet}
</StickyBar>

<main id="main">
	{#if birds.length === 0}
		<EmptyState message={label(labels, 'NoBirds')} />
	{:else}
		<TileGrid>
			{#each birds as bird (bird.id)}
				<BirdTileCard {bird} {labels} />
			{/each}
		</TileGrid>
	{/if}
</main>
