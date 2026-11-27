<script lang="ts">
	import type { Snippet } from 'svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import Field from '@universe/showcase/components/Field.svelte';
	import FormActions from '@universe/showcase/components/FormActions.svelte';
	import Select from '@universe/showcase/components/Select.svelte';
	import {
		buildBirdFormData,
		emptyBirdForm,
		validateBirdForm,
		type BirdFormState
	} from '#lib/bird-form';
	import { label, type Labels } from '#lib/labels';
	import type { PictureItem } from '#lib/picture-list';
	import { postForm } from '#lib/post-form';
	import PictureList from './PictureList.svelte';
	import SimilarNames from './SimilarNames.svelte';

	/**
	 * The one Bird form, for Add now and Edit (#285): Edit passes `initial`, `initialPictures`,
	 * its own `action`, `seenLocked` (a Bird with a Sighting stays Seen), `similar={false}` and
	 * an Archive button in `start`.
	 */
	let {
		labels,
		habitats,
		songs,
		action = '?/addBird',
		initial = emptyBirdForm(),
		initialPictures = [],
		seenLocked = false,
		similar = true,
		onDone,
		start
	}: {
		labels: Labels;
		/** Habitat and Songs come from the Admin lists only: pick, never type. */
		habitats: { id: number; name: string }[];
		songs: { id: number; name: string }[];
		/** The form action of the current page that takes the form data. */
		action?: string;
		initial?: BirdFormState;
		initialPictures?: PictureItem[];
		seenLocked?: boolean;
		/** Birds with a matching name show as small tiles while typing. */
		similar?: boolean;
		onDone: () => void;
		/** Left of the Save row. */
		start?: Snippet;
	} = $props();

	// The form is mounted per opening, so the starting values are read once.
	/* svelte-ignore state_referenced_locally */
	let form = $state<BirdFormState>(structuredClone(initial));
	/* svelte-ignore state_referenced_locally */
	let pictures = $state<PictureItem[]>([...initialPictures]);
	let error = $state<string | null>(null);
	let busy = $state(false);

	const habitatOptions = $derived([
		{ value: '', label: label(labels, 'NoHabitat') },
		...habitats.map((h) => ({ value: String(h.id), label: h.name }))
	]);

	const FLAGS = [
		['seen', 'Seen'],
		['flown', 'Flown'],
		['lost', 'Lost'],
		['roosted', 'Roosted'],
		['nest', 'Nest']
	] as const;

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const problem = validateBirdForm(form, pictures.length);
		if (problem) {
			error = problem;
			return;
		}
		error = null;
		busy = true;
		const outcome = await postForm(action, buildBirdFormData(form, pictures));
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<form class="flex flex-col gap-4" onsubmit={submit}>
	<Field label={label(labels, 'Name')} required bind:value={form.name} />
	{#if similar}<SimilarNames text={form.name} {labels} />{/if}

	<PictureList bind:items={pictures} {labels} />

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-bold">{label(labels, 'Habitat')}</span>
		<Select bind:value={form.habitatId} label={label(labels, 'Habitat')} options={habitatOptions} />
	</div>

	{#if songs.length > 0}
		<fieldset class="flex flex-col gap-1">
			<legend class="mb-1 text-sm font-bold">{label(labels, 'Songs')}</legend>
			{#each songs as song (song.id)}
				<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
					<input
						type="checkbox"
						value={String(song.id)}
						bind:group={form.songIds}
						class="size-5 accent-icon-accent"
					/>
					{song.name}
				</label>
			{/each}
		</fieldset>
	{/if}

	<Field
		label={label(labels, 'Arrival')}
		type="date"
		placeholder="2024, 2024-05 or 2024-05-12"
		bind:value={form.arrival}
	/>

	<fieldset class="flex flex-wrap gap-x-4">
		{#each FLAGS as [key, code] (key)}
			{@const locked = key === 'seen' && seenLocked}
			<label class="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					checked={locked || form.flags[key]}
					disabled={locked}
					onchange={(e) => (form.flags[key] = e.currentTarget.checked)}
					class="size-5 accent-icon-accent"
				/>
				{label(labels, code)}
			</label>
		{/each}
	</fieldset>

	<label class="flex flex-col gap-1.5 text-sm font-bold">
		{label(labels, 'Notes')}
		<textarea
			bind:value={form.notes}
			rows="3"
			class="rounded-md border border-input bg-background p-3 font-normal"></textarea>
	</label>

	{#if error}<ErrorMessage message={label(labels, error)} />{/if}
	<FormActions {busy} onCancel={onDone} {start} />
</form>
