<script lang="ts">
	import { enhance } from '$app/forms';
	import { label, type Labels } from '#lib/labels';
	import type { BirdTile, ListValue } from '#lib/server/catalog/types';
	import Button from '@universe/showcase/components/Button.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import Select from '@universe/showcase/components/Select.svelte';

	let {
		birds,
		habitats,
		labels,
		error = null
	}: {
		birds: BirdTile[];
		habitats: ListValue[];
		labels: Labels;
		/** Label code name of the last refusal on this form. */
		error?: string | null;
	} = $props();

	const FLAGS = ['seen', 'flown', 'lost', 'roosted', 'nest'] as const;
	const FLAG_LABELS = {
		seen: 'Seen',
		flown: 'Flown',
		lost: 'Lost',
		roosted: 'Roosted',
		nest: 'Nest'
	} as const;

	let selected = $state<number[]>([]);
	let habitat = $state('');
	let flags = $state<Record<(typeof FLAGS)[number], string>>({
		seen: '',
		flown: '',
		lost: '',
		roosted: '',
		nest: ''
	});

	const habitatOptions = $derived([
		{ value: '', label: label(labels, 'BatchKeep') },
		{ value: 'none', label: label(labels, 'NoHabitat') },
		...habitats.map((h) => ({ value: String(h.id), label: h.name }))
	]);
	const flagOptions = $derived([
		{ value: '', label: label(labels, 'BatchKeep') },
		{ value: 'on', label: label(labels, 'BatchSet') },
		{ value: 'off', label: label(labels, 'BatchClear') }
	]);

	const changed = $derived(habitat !== '' || FLAGS.some((key) => flags[key] !== ''));
	const allSelected = $derived(birds.length > 0 && selected.length === birds.length);

	function toggleAll(checked: boolean) {
		selected = checked ? birds.map((b) => b.id) : [];
	}

	function reset() {
		selected = [];
		habitat = '';
		for (const key of FLAGS) flags[key] = '';
	}
</script>

<section class="flex flex-col gap-3" aria-labelledby="batch-heading">
	<h2 id="batch-heading">{label(labels, 'BatchEdit')}</h2>

	{#if error}<ErrorMessage message={label(labels, error)} />{/if}

	<form
		method="POST"
		action="?/editBirds"
		class="flex flex-col gap-3"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') reset();
			}}
	>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="flex flex-col gap-1.5">
				<span class="text-sm font-bold">{label(labels, 'Habitat')}</span>
				<Select bind:value={habitat} label={label(labels, 'Habitat')} options={habitatOptions} />
				<input type="hidden" name="habitat" value={habitat} />
			</div>
			{#each FLAGS as key (key)}
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-bold">{label(labels, FLAG_LABELS[key])}</span>
					<Select
						bind:value={flags[key]}
						label={label(labels, FLAG_LABELS[key])}
						options={flagOptions}
					/>
					<input type="hidden" name={key} value={flags[key]} />
				</div>
			{/each}
		</div>

		<ul class="flex max-h-80 flex-col overflow-y-auto rounded-md border border-input">
			<li class="border-b border-input">
				<label class="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-bold">
					<input
						type="checkbox"
						checked={allSelected}
						onchange={(e) => toggleAll(e.currentTarget.checked)}
						class="size-5 accent-icon-accent"
					/>
					{label(labels, 'BatchSelectAll')}
					<span class="ml-auto font-normal text-muted-foreground">{selected.length}</span>
				</label>
			</li>
			{#each birds as bird (bird.id)}
				<li>
					<label class="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm">
						<input
							type="checkbox"
							name="ids"
							value={bird.id}
							bind:group={selected}
							class="size-5 accent-icon-accent"
						/>
						<span class="truncate">{bird.name}</span>
					</label>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-muted-foreground">{label(labels, 'NoBirds')}</li>
			{/each}
		</ul>

		<div class="flex justify-end">
			<Button type="submit" intent="success" disabled={selected.length === 0 || !changed}>
				{label(labels, 'BatchApply')}
			</Button>
		</div>
	</form>
</section>
