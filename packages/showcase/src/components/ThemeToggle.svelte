<script lang="ts">
	import { onMount } from 'svelte';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import { Button } from './ui/button/index.js';
	import { getUiLabels } from '../ui-labels.js';

	const ui = getUiLabels();

	let dark = $state(false);

	// app.html sets data-theme before first paint when a choice is saved.
	onMount(() => {
		const saved = document.documentElement.dataset.theme;
		dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Storage blocked: the choice lasts until reload.
		}
	}
</script>

<Button variant="neutral" size="icon-sm" onclick={toggle}>
	{#if dark}
		<SunIcon aria-hidden="true" class="size-4" />
	{:else}
		<MoonIcon aria-hidden="true" class="size-4" />
	{/if}
	<span class="sr-only">{dark ? ui().switchToLight : ui().switchToDark}</span>
</Button>
