<script lang="ts">
	import type { AcquisitionState } from '#lib/forms';
	import Field from '@universe/showcase/components/Field.svelte';
	import StoreSelect from '@universe/showcase/components/StoreSelect.svelte';
	import ToggleGroup from '@universe/showcase/components/ToggleGroup.svelte';

	let {
		acquisition = $bindable(),
		stores,
		onAddStore
	}: {
		acquisition: AcquisitionState;
		stores: { id: number; name: string }[];
		onAddStore: (name: string) => Promise<{ id: number | string }>;
	} = $props();
</script>

<ToggleGroup
	label="Acquisition"
	bind:value={acquisition.kind}
	options={[
		{ value: 'purchase', label: 'Purchase' },
		{ value: 'gift', label: 'Gift' }
	]}
/>
{#if acquisition.kind === 'purchase'}
	<StoreSelect bind:value={acquisition.storeId} {stores} {onAddStore} />
	<Field label="Price (€)" type="number" required bind:value={acquisition.price} />
{:else}
	<Field label="From" bind:value={acquisition.giver} />
{/if}
