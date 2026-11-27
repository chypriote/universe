<script lang="ts">
	import type { Component } from 'svelte';
	import { Badge } from './ui/badge/index.js';

	let {
		tone,
		label,
		value,
		icon: Icon
	}: {
		tone: 'highlight' | 'success' | 'info';
		label: string;
		/** Already formatted ("67", "4 120,00 €"). */
		value: string;
		/** Shown in place of the label below `sm`. */
		icon?: Component<{ class?: string; 'aria-hidden'?: 'true' }>;
	} = $props();
</script>

<Badge variant={tone}>
	{#if Icon}
		<Icon aria-hidden="true" class="size-4 sm:hidden" />
	{/if}
	<span class="font-extrabold">{value}</span>
	<span class={['font-bold', Icon && 'sr-only sm:not-sr-only']}>{label}</span>
</Badge>
