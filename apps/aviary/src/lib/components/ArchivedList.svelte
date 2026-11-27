<script lang="ts">
	import { enhance } from '$app/forms';
	import { label, type Labels } from '#lib/labels';
	import type { BirdTile } from '#lib/server/catalog/types';
	import Button from '@universe/showcase/components/Button.svelte';
	import ConfirmDialog from '@universe/showcase/components/ConfirmDialog.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';

	let {
		birds,
		labels,
		error = null
	}: {
		birds: BirdTile[];
		labels: Labels;
		/** Label code name of the last refusal on this list. */
		error?: string | null;
	} = $props();

	/** The Bird the Owner is about to delete for good. */
	let deleting = $state<BirdTile | null>(null);
	let deleteForm = $state<HTMLFormElement | null>(null);
	let deleteId = $state(0);

	function confirmDelete() {
		if (!deleting) return;
		deleteId = deleting.id;
		deleting = null;
		// Wait for the hidden input to take the new value.
		queueMicrotask(() => deleteForm?.requestSubmit());
	}
</script>

<section class="flex flex-col gap-3" aria-labelledby="archived-heading">
	<h2 id="archived-heading">{label(labels, 'Archived')}</h2>

	{#if error}<ErrorMessage message={label(labels, error)} />{/if}

	<ul class="flex flex-col gap-2">
		{#each birds as bird (bird.id)}
			<li class="flex flex-wrap items-center gap-2">
				<span class="min-w-40 flex-1 truncate">{bird.name}</span>
				<form method="POST" action="?/restore" use:enhance>
					<input type="hidden" name="id" value={bird.id} />
					<Button type="submit" size="sm">{label(labels, 'Restore')}</Button>
				</form>
				<Button intent="danger" size="sm" onclick={() => (deleting = bird)}>
					{label(labels, 'DeleteForever')}
				</Button>
			</li>
		{:else}
			<li class="text-sm text-muted-foreground">{label(labels, 'NoArchived')}</li>
		{/each}
	</ul>

	<form method="POST" action="?/deleteForever" use:enhance bind:this={deleteForm} class="hidden">
		<input type="hidden" name="id" value={deleteId} />
	</form>

	<ConfirmDialog
		open={deleting !== null}
		title={label(labels, 'DeleteForever')}
		text={deleting ? `${deleting.name}. ${label(labels, 'DeleteForeverText')}` : ''}
		actionLabel={label(labels, 'DeleteForever')}
		onConfirm={confirmDelete}
	/>
</section>
