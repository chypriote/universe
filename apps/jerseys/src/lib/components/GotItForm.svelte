<script lang="ts">
	import FormActions from '@universe/showcase/components/FormActions.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import { untrack } from 'svelte';
	import { addStore, emptyAcquisition, postAction, toAcquisitionInput } from '#lib/forms';
	import { fitLabels, labelOptions, versionLabels } from '#lib/labels';
	import type { Fit, Size, Store, Version } from '#lib/server/catalog/types';
	import AcquisitionFields from './AcquisitionFields.svelte';
	import Field from '@universe/showcase/components/Field.svelte';
	import ToggleGroup from '@universe/showcase/components/ToggleGroup.svelte';

	let {
		wishlistItemId,
		version: wantedVersion,
		stores,
		onDone,
		onCancel
	}: {
		wishlistItemId: number;
		/** The Wishlist Item's Version (null = any): pre-sets the field. */
		version: Version | null;
		stores: Store[];
		/** Saved: the Wishlist Item is gone. */
		onDone: () => void;
		onCancel: () => void;
	} = $props();

	// The field starts from the prop and is then edited freely.
	let version = $state<Version>(untrack(() => wantedVersion) ?? 'fan');
	let size = $state<Size>('M');
	let fit = $state<Fit>('good');
	let print = $state('');
	let acquisition = $state(emptyAcquisition());
	let error = $state<string | null>(null);
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const acquisitionInput = toAcquisitionInput(acquisition);
		if (typeof acquisitionInput === 'string') {
			error = acquisitionInput;
			return;
		}
		busy = true;
		const outcome = await postAction('?/gotIt', {
			wishlistItemId,
			jersey: { version, size, fit, print: print.trim() || null, acquisition: acquisitionInput }
		});
		busy = false;
		if (outcome.ok) onDone();
		else error = outcome.error;
	}
</script>

<!-- Two columns from `sm` (Popup `wide`), as the JerseyForm. -->
<form class="grid grid-cols-1 gap-4 sm:grid-cols-2" onsubmit={submit}>
	<ToggleGroup label="Version" bind:value={version} options={labelOptions(versionLabels)} />
	<ToggleGroup
		label="Size"
		bind:value={size}
		options={(['S', 'M', 'L'] as const).map((s) => ({ value: s, label: s }))}
	/>
	<ToggleGroup label="Fit" bind:value={fit} options={labelOptions(fitLabels)} />
	<Field label="Print" bind:value={print} />
	<AcquisitionFields bind:acquisition {stores} onAddStore={addStore} />
	{#if error}
		<ErrorMessage message={error} class="sm:col-span-2" />
	{/if}
	<div class="sm:col-span-2"><FormActions {busy} {onCancel} /></div>
</form>
