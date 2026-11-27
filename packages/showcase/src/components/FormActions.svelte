<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import { getUiLabels } from '../ui-labels.js';

	const ui = getUiLabels();

	let {
		busy = false,
		disabled = false,
		onCancel,
		start
	}: {
		/** Save shows its spinner. */
		busy?: boolean;
		disabled?: boolean;
		/** Shows "Cancel" before "Save". */
		onCancel?: () => void;
		/** Left of the row: DeleteAction, other actions on the thing. */
		start?: Snippet;
	} = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	{@render start?.()}
	<div class="ms-auto flex gap-2">
		{#if onCancel}<Button onclick={onCancel}>{ui().cancel}</Button>{/if}
		<Button intent="success" type="submit" loading={busy} {disabled}>{ui().save}</Button>
	</div>
</div>
