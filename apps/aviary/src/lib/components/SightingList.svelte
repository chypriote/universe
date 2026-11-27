<script lang="ts">
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Button from '@universe/showcase/components/Button.svelte';
	import ConfirmDialog from '@universe/showcase/components/ConfirmDialog.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
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

	let error = $state<string | null>(null);
	let deleting = $state<Sighting | null>(null);
	let confirming = $state(false);

	async function run(body: Record<string, unknown>) {
		const code = await change(body);
		error = code ? label(labels, `Sighting.${code}`) : null;
		if (!code) await onChange();
	}
</script>

<div class="flex flex-col gap-2">
	{#if sightings.length}
		<ul class="flex flex-col gap-1">
			{#each sightings as sighting (sighting.id)}
				<li class="flex items-center gap-2">
					<input
						type="date"
						class="min-h-(--control-size-min) min-w-0 flex-1 rounded-control bg-card px-2 font-bold text-foreground outline-ring focus-visible:outline-3 focus-visible:outline-solid"
						aria-label={label(labels, 'SightingDay')}
						value={sighting.day ?? ''}
						onchange={(e) =>
							run({ op: 'day', id: sighting.id, day: e.currentTarget.value || null })}
					/>
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
		<Button size="icon-sm" onclick={() => run({ op: 'add', day: today() })}>
			<PlusIcon class="size-4" aria-hidden="true" />
			<span class="sr-only">{label(labels, 'SightingAdd')}</span>
		</Button>
	</div>
	{#if error}<ErrorMessage message={error} />{/if}
</div>

<ConfirmDialog
	bind:open={confirming}
	title={label(labels, 'SightingDeleteTitle')}
	text={deleting?.day ?? label(labels, 'SightingNoDay')}
	actionLabel={label(labels, 'SightingDelete')}
	onConfirm={() => deleting && run({ op: 'delete', id: deleting.id })}
/>
