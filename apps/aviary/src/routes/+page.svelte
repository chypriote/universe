<script lang="ts">
	import { label } from '#lib/labels';
	import { lists } from '#lib/lists';
	import AdminLink from '#lib/components/AdminLink.svelte';
	import EmptyState from '@universe/showcase/components/EmptyState.svelte';
	import StickyBar from '@universe/showcase/components/StickyBar.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const appLabel = $derived(label(data.labels, 'Aviary'));
</script>

<svelte:head><title>{appLabel} | {label(data.labels, 'Aloft')}</title></svelte:head>

<StickyBar current="aloft" links={lists(data.labels)}>
	{#snippet login()}<AdminLink label={label(data.labels, 'Admin')} />{/snippet}
	{#snippet title()}{appLabel}<span class="text-icon-accent">.</span>{/snippet}
</StickyBar>

<main id="main">
	<EmptyState message={label(data.labels, 'NoBirds')} />
</main>
