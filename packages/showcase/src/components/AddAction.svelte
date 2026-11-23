<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from './Button.svelte';
	import Popup from './Popup.svelte';

	let {
		title,
		wide = false,
		form
	}: {
		/** Popup title, e.g. "Add a jersey". */
		title: string;
		/** A form laid out in two columns from `sm` (`popup-width-wide`). */
		wide?: boolean;
		/** The form; call `close` when it is done. */
		form: Snippet<[close: () => void]>;
	} = $props();

	let open = $state(false);
	const close = () => (open = false);
</script>

<Button intent="success" onclick={() => (open = true)}>Add</Button>

<Popup bind:open {title} {wide}>
	{#snippet details()}
		{#if open}{@render form(close)}{/if}
	{/snippet}
</Popup>
