<script lang="ts">
	import { page } from '$app/state';
	import AddAction from '@universe/showcase/components/AddAction.svelte';
	import { label, type Labels } from '#lib/labels';
	import type { ListValue } from '#lib/server/catalog/types';
	import BirdForm from './BirdForm.svelte';

	let { labels }: { labels: Labels } = $props();

	// Every tab page loads the two lists; reading them here keeps the tab pages unchanged.
	const habitats = $derived((page.data.habitats ?? []) as ListValue[]);
	const songs = $derived((page.data.songs ?? []) as ListValue[]);
</script>

<AddAction title={label(labels, 'AddBird')}>
	{#snippet form(close)}
		<BirdForm {labels} {habitats} {songs} onDone={close} />
	{/snippet}
</AddAction>
