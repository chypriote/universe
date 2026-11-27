<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Button from '@universe/showcase/components/Button.svelte';
	import ConfirmDialog from '@universe/showcase/components/ConfirmDialog.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import { formatDate } from '@universe/universe/format';
	import { label, type Labels } from '#lib/labels';
	import { today } from '#lib/sightings';
	import type { Sighting } from '#lib/server/catalog/types';

	let {
		sightings,
		labels,
		onChange,
		change
	}: {
		sightings: Sighting[];
		labels: Labels;
		/** Runs after a change went through: the popup reloads the Bird. */
		onChange: () => void | Promise<void>;
		/** Sends one change to the server. Answers the error code, or null. */
		change: (body: Record<string, unknown>) => Promise<string | null>;
	} = $props();

	let pickers = $state<Record<number, HTMLInputElement>>({});
	let error = $state<string | null>(null);
	let deleting = $state<Sighting | null>(null);
	let confirming = $state(false);
	let busy = $state(false);

	async function run(body: Record<string, unknown>) {
		busy = true;
		const code = await change(body);
		error = code ? label(labels, `Sighting.${code}`) : null;
		if (!code) await onChange();
		busy = false;
	}
</script>

<div class="flex flex-col gap-2">
	{#if sightings.length}
		<ul class="flex flex-col gap-1">
			{#each sightings as sighting (sighting.id)}
				<li class="relative flex items-center gap-2">
					<span class="min-w-0 flex-1 font-bold text-foreground">
						{sighting.day ? formatDate(sighting.day) : label(labels, 'SightingNoDay')}
					</span>
					<input
						bind:this={pickers[sighting.id]}
						type="date"
						class="pointer-events-none absolute top-full right-0 size-px opacity-0"
						tabindex="-1"
						aria-hidden="true"
						value={sighting.day ?? ''}
						onchange={(e) =>
							run({ op: 'day', id: sighting.id, day: e.currentTarget.value || null })}
					/>
					<Button size="icon-sm" onclick={() => pickers[sighting.id]?.showPicker()}>
						<CalendarIcon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'SightingDay')}</span>
					</Button>
					<Button
						intent="danger"
						size="icon-sm"
						onclick={() => {
							deleting = sighting;
							confirming = true;
						}}
					>
						<Trash2Icon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'SightingDelete')}</span>
					</Button>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="flex justify-end">
		<Button size="icon-sm" disabled={busy} onclick={() => run({ op: 'add', day: today() })}>
			<PlusIcon class="size-4" aria-hidden="true" />
			<span class="sr-only">{label(labels, 'SightingAdd')}</span>
		</Button>
	</div>
	{#if error}<ErrorMessage message={error} />{/if}
</div>

<ConfirmDialog
	bind:open={confirming}
	title={label(labels, 'SightingDeleteTitle')}
	text={deleting?.day ? formatDate(deleting.day) : label(labels, 'SightingNoDay')}
	actionLabel={label(labels, 'SightingDelete')}
	onConfirm={() => deleting && run({ op: 'delete', id: deleting.id })}
/>
