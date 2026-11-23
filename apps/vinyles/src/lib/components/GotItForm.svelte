<script lang="ts">
	import FormActions from '@universe/showcase/components/FormActions.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import { addStore, emptyAcquisition, postAction, toAcquisitionInput } from '#lib/forms';
	import { untrack } from 'svelte';
	import AcquisitionFields from './AcquisitionFields.svelte';
	import Field from '@universe/showcase/components/Field.svelte';

	let {
		wishlistItemId,
		variant: initialVariant,
		stores,
		onDone
	}: {
		wishlistItemId: number;
		variant: string | null;
		stores: { id: number; name: string }[];
		onDone: () => void;
	} = $props();

	// The field starts from the prop and is then edited freely.
	let variant = $state(untrack(() => initialVariant) ?? '');
	let acquisition = $state(emptyAcquisition());
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const input = toAcquisitionInput(acquisition);
		if (typeof input === 'string') {
			error = input;
			return;
		}
		busy = true;
		const outcome = await postAction('?/gotIt', {
			wishlistItemId,
			variant: variant.trim() || null,
			acquisition: input
		});
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<form class="flex flex-col gap-4" onsubmit={submit}>
	<Field label="Variant" bind:value={variant} />
	<Field label="Date" type="date" required bind:value={acquisition.date} />
	<AcquisitionFields bind:acquisition {stores} onAddStore={addStore} />
	{#if error}<ErrorMessage message={error} />{/if}
	<FormActions {busy} onCancel={onDone} />
</form>
