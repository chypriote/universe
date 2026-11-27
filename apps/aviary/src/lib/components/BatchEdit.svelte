<script lang="ts">
	import { enhance } from '$app/forms';
	import EggIcon from '@lucide/svelte/icons/egg';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MapPinOffIcon from '@lucide/svelte/icons/map-pin-off';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PlaneTakeoffIcon from '@lucide/svelte/icons/plane-takeoff';
	import { label, type Labels } from '#lib/labels';
	import { initials, tintClass } from '#lib/tile';
	import type { BatchBird, ListValue } from '#lib/server/catalog/types';
	import Button from '@universe/showcase/components/Button.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import Select from '@universe/showcase/components/Select.svelte';

	let {
		birds,
		habitats,
		labels,
		error = null
	}: {
		birds: BatchBird[];
		habitats: ListValue[];
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
		class="grid gap-4 lg:grid-cols-3"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') reset();
			}}
	>
		<ul
			class="flex max-h-[32rem] flex-col overflow-y-auto rounded-md border border-input lg:col-span-1"
		>
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
					<label class="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-1 text-sm">
						<input
							type="checkbox"
							name="ids"
							value={bird.id}
							bind:group={selected}
							class="size-5 shrink-0 accent-icon-accent"
						/>
						{#if bird.pictureId !== null && !failed.includes(bird.id)}
							<img
								src="/pictures/{bird.pictureId}"
								alt=""
								width="32"
								height="32"
								loading="lazy"
								class="size-8 shrink-0 rounded-sm object-cover"
								onerror={() => (failed = [...failed, bird.id])}
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
						<span class="ms-auto flex shrink-0 gap-1">
							{#each FLAGS.filter((key) => bird[key]) as key (key)}
								{@const look = FLAG_LOOK[key]}
								<span title={label(labels, look.code)}>
									<look.icon class="size-4 {look.color}" aria-hidden="true" />
									<span class="sr-only">{label(labels, look.code)}</span>
								</span>
							{/each}
						</span>
					</label>
				</li>
			{:else}
				<li class="px-3 py-2 text-sm text-muted-foreground">{label(labels, 'NoBirds')}</li>
			{/each}
		</ul>

		<div class="flex flex-col gap-4 lg:col-span-2">
			<div class="grid gap-3 sm:grid-cols-2">
				<div class="flex flex-col gap-1.5">
					<span class="text-sm font-bold">{label(labels, 'Habitat')}</span>
					<Select bind:value={habitat} label={label(labels, 'Habitat')} options={habitatOptions} />
					<input type="hidden" name="habitat" value={habitat} />
				</div>
				{#each FLAGS as key (key)}
					<div class="flex flex-col gap-1.5">
						<span class="text-sm font-bold">{label(labels, FLAG_LOOK[key].code)}</span>
						<Select
							bind:value={flags[key]}
							label={label(labels, FLAG_LOOK[key].code)}
							options={flagOptions}
						/>
						<input type="hidden" name={key} value={flags[key]} />
					</div>
				{/each}
			</div>
			<div class="flex justify-end">
				<Button type="submit" intent="success" disabled={selected.length === 0 || !changed}>
					{label(labels, 'BatchApply')}
				</Button>
			</div>
		</div>
	</form>
</section>
