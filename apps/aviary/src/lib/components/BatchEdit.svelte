<script lang="ts">
	import { enhance } from '$app/forms';
	import EggIcon from '@lucide/svelte/icons/egg';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import TreesIcon from '@lucide/svelte/icons/trees';
	import MapPinOffIcon from '@lucide/svelte/icons/map-pin-off';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PlaneTakeoffIcon from '@lucide/svelte/icons/plane-takeoff';
	import { label, type Labels } from '#lib/labels';
	import { initials, tintClass } from '#lib/tile';
	import type { BatchBird, ListValue } from '#lib/server/catalog/types';
	import BirdPicture from './BirdPicture.svelte';
	import Button from '@universe/showcase/components/Button.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import SearchField from '@universe/showcase/components/SearchField.svelte';
	import SortDirection from '@universe/showcase/components/SortDirection.svelte';
	import Select from '@universe/showcase/components/Select.svelte';

	let {
		birds,
		habitats,
		songs,
		labels,
		error = null
	}: {
		birds: BatchBird[];
		habitats: ListValue[];
		songs: ListValue[];
		labels: Labels;
		/** Label code name of the last refusal on this form. */
		error?: string | null;
	} = $props();

	const FLAGS = ['seen', 'flown', 'lost', 'roosted', 'nest'] as const;
	// Same icons and colours as the BirdTile flags and the BirdForm; Roosted is a moon.
	const FLAG_LOOK = {
		seen: { code: 'Seen', icon: EyeIcon, color: 'text-info' },
		flown: { code: 'Flown', icon: PlaneTakeoffIcon, color: 'text-success' },
		lost: { code: 'Lost', icon: MapPinOffIcon, color: 'text-destructive' },
		roosted: { code: 'Roosted', icon: MoonIcon, color: 'text-muted-foreground' },
		nest: { code: 'Nest', icon: EggIcon, color: 'text-highlight' }
	} as const;

	let selected = $state<number[]>([]);
	/** Birds whose thumbnail failed to load; they show initials instead. */
	let failed = $state<number[]>([]);
	let habitat = $state('');
	let addSong = $state('');
	let removeSong = $state('');
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
	const songOptions = $derived([
		{ value: '', label: label(labels, 'BatchKeep') },
		...songs.map((s) => ({ value: String(s.id), label: s.name }))
	]);
	const flagOptions = $derived([
		{ value: '', label: label(labels, 'BatchKeep') },
		{ value: 'on', label: label(labels, 'BatchSet') },
		{ value: 'off', label: label(labels, 'BatchClear') }
	]);

	const changed = $derived(
		habitat !== '' || addSong !== '' || removeSong !== '' || FLAGS.some((key) => flags[key] !== '')
	);

	const habitatName = $derived(new Map(habitats.map((h) => [h.id, h.name])));

	let search = $state('');
	let sortKey = $state<'arrival' | 'name'>('arrival');
	let direction = $state('desc');
	const sortOptions = $derived([
		{ value: 'arrival', label: label(labels, 'Arrival') },
		{ value: 'name', label: label(labels, 'Name') }
	]);

	/** A month or year Arrival counts as the first day of it, so it sorts with day Arrivals. */
	const arrivalKey = (arrival: string | null) =>
		arrival === null
			? null
			: arrival.length === 4
				? `${arrival}-01-01`
				: arrival.length === 7
					? `${arrival}-01`
					: arrival;

	/** Birds that match the search, sorted; a Bird with no Arrival goes last either way. */
	const visible = $derived.by(() => {
		const needle = search.trim().toLowerCase();
		const sign = direction === 'asc' ? 1 : -1;
		return birds
			.filter((b) => b.name.toLowerCase().includes(needle))
			.sort((a, b) => {
				if (sortKey === 'name') return sign * (a.name.localeCompare(b.name) || a.id - b.id);
				const ka = arrivalKey(a.arrival);
				const kb = arrivalKey(b.arrival);
				if (ka === kb) return a.name.localeCompare(b.name) || a.id - b.id;
				if (ka === null) return 1;
				if (kb === null) return -1;
				return sign * (ka < kb ? -1 : 1);
			});
	});
	const allSelected = $derived(visible.length > 0 && visible.every((b) => selected.includes(b.id)));

	function toggle(id: number, checked: boolean) {
		selected = checked ? [...selected, id] : selected.filter((x) => x !== id);
	}

	function toggleAll(checked: boolean) {
		const ids = new Set(visible.map((b) => b.id));
		selected = checked
			? [...selected, ...visible.map((b) => b.id).filter((id) => !selected.includes(id))]
			: selected.filter((id) => !ids.has(id));
	}

	function reset() {
		selected = [];
		habitat = '';
		addSong = '';
		removeSong = '';
		for (const key of FLAGS) flags[key] = '';
	}
</script>

<section class="flex flex-col gap-3" aria-labelledby="batch-heading">
	<h2 id="batch-heading">{label(labels, 'BatchEdit')}</h2>

	{#if error}<ErrorMessage message={label(labels, error)} />{/if}

	<form
		method="POST"
		action="?/editBirds"
		class="flex flex-col gap-4"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') reset();
			}}
	>
		<div class="grid gap-3 sm:grid-cols-3">
			<div class="flex flex-col gap-1.5">
				<span class="flex items-center gap-1.5 text-xs font-bold">
					<TreesIcon class="size-4 text-icon-accent" aria-hidden="true" />
					{label(labels, 'Habitat')}
				</span>
				<Select bind:value={habitat} label={label(labels, 'Habitat')} options={habitatOptions} />
				<input type="hidden" name="habitat" value={habitat} />
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold">{label(labels, 'BatchAddSong')}</span>
				<Select bind:value={addSong} label={label(labels, 'BatchAddSong')} options={songOptions} />
				<input type="hidden" name="addSong" value={addSong} />
			</div>
			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold">{label(labels, 'BatchRemoveSong')}</span>
				<Select
					bind:value={removeSong}
					label={label(labels, 'BatchRemoveSong')}
					options={songOptions}
				/>
				<input type="hidden" name="removeSong" value={removeSong} />
			</div>
			{#each FLAGS as key (key)}
				{@const look = FLAG_LOOK[key]}
				<div class="flex flex-col gap-1.5">
					<span class="flex items-center gap-1.5 text-xs font-bold">
						<look.icon class="size-4 {look.color}" aria-hidden="true" />
						{label(labels, look.code)}
					</span>
					<Select
						bind:value={flags[key]}
						label={label(labels, FLAG_LOOK[key].code)}
						options={flagOptions}
					/>
					<input type="hidden" name={key} value={flags[key]} />
				</div>
			{/each}
			<div class="flex justify-end sm:self-end">
				<Button type="submit" intent="success" disabled={selected.length === 0 || !changed}>
					{label(labels, 'BatchApply')}
				</Button>
			</div>
		</div>

		<div class="flex flex-wrap items-end gap-2">
			<SearchField
				bind:value={search}
				label={label(labels, 'SearchBirds')}
				placeholder={label(labels, 'SearchBirds')}
			/>
			<div class="w-44">
				<Select bind:value={sortKey} label={label(labels, 'BatchSortBy')} options={sortOptions} />
			</div>
			<SortDirection bind:value={direction} />
		</div>

		{#each selected as id (id)}<input type="hidden" name="ids" value={id} />{/each}
		<ul class="flex max-h-[32rem] flex-col overflow-y-auto rounded-md border border-input">
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
			{#each visible as bird (bird.id)}
				<li>
					<label class="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-1 text-sm">
						<input
							type="checkbox"
							checked={selected.includes(bird.id)}
							onchange={(e) => toggle(bird.id, e.currentTarget.checked)}
							class="size-5 shrink-0 accent-icon-accent"
						/>
						{#if bird.pictureId !== null && !failed.includes(bird.id)}
							<BirdPicture
								pictureId={bird.pictureId}
								class="size-8 shrink-0 rounded-sm object-cover"
								onFail={() => (failed = [...failed, bird.id])}
							/>
						{:else}
							<span
								class="flex size-8 shrink-0 items-center justify-center rounded-sm text-xs font-extrabold text-primary-foreground {tintClass(
									bird.name
								)}"
								aria-hidden="true"
							>
								{initials(bird.name)}
							</span>
						{/if}
						<span class="truncate">{bird.name}</span>
						<span class="ms-auto w-24 shrink-0 truncate text-xs text-muted-foreground sm:w-32">
							{habitatName.get(bird.habitatId ?? -1) ?? ''}
						</span>
						<span class="flex shrink-0 gap-1">
							{#each FLAGS as key (key)}
								{@const look = FLAG_LOOK[key]}
								<span class="size-4" title={bird[key] ? label(labels, look.code) : undefined}>
									{#if bird[key]}
										<look.icon class="size-4 {look.color}" aria-hidden="true" />
										<span class="sr-only">{label(labels, look.code)}</span>
									{/if}
								</span>
							{/each}
						</span>
					</label>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-muted-foreground">{label(labels, 'NoBirds')}</li>
			{/each}
		</ul>
	</form>
</section>
