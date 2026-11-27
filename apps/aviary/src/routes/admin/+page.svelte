<script lang="ts">
	import { label } from '#lib/labels';
	import { lists } from '#lib/lists';
	import BatchEdit from '#lib/components/BatchEdit.svelte';
	import ArchivedList from '#lib/components/ArchivedList.svelte';
	import ValueList from '#lib/components/ValueList.svelte';
	import StickyBar from '@universe/showcase/components/StickyBar.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const appLabel = $derived(label(data.labels, 'Aviary'));
	const refusal = (kind: 'habitat' | 'song') => (form?.kind === kind ? (form.error ?? null) : null);
</script>

<svelte:head><title>{appLabel} | {label(data.labels, 'Admin')}</title></svelte:head>

<StickyBar current="admin" links={lists(data.labels)}>
	{#snippet title()}{label(data.labels, 'Admin')}<span class="text-icon-accent">.</span>{/snippet}
</StickyBar>

<main id="main" class="flex flex-col gap-8 px-4 pb-12 lg:max-w-6xl">
	<div class="grid gap-8 lg:grid-cols-3">
		<div class="flex flex-col gap-8">
			<ValueList
				kind="habitat"
				heading={label(data.labels, 'Habitat')}
				values={data.habitats}
				labels={data.labels}
				error={refusal('habitat')}
			/>
			<ValueList
				kind="song"
				heading={label(data.labels, 'Songs')}
				values={data.songs}
				labels={data.labels}
				error={refusal('song')}
			/>
		</div>
		<div class="lg:col-span-2">
			<BatchEdit
				birds={data.birds}
				habitats={data.habitats}
				labels={data.labels}
				error={form && 'batchError' in form ? (form.batchError ?? null) : null}
			/>
		</div>
	</div>
	<div class="sm:max-w-xl">
		<ArchivedList
			birds={data.archived}
			labels={data.labels}
			error={form && 'archivedError' in form ? (form.archivedError ?? null) : null}
		/>
	</div>
</main>
