<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { label } from '#lib/labels';
	import Signature from '@universe/showcase/components/Signature.svelte';
	import SkipLink from '@universe/showcase/components/SkipLink.svelte';
	import { setUiLabels } from '@universe/showcase/ui-labels';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// The shared components' fixed words come from the labels too.
	setUiLabels(() => ({
		skipToContent: label(data.labels, 'SkipToContent'),
		switchToLight: label(data.labels, 'SwitchToLight'),
		switchToDark: label(data.labels, 'SwitchToDark'),
		cancel: label(data.labels, 'Cancel'),
		save: label(data.labels, 'Save'),
		lists: label(data.labels, 'Lists'),
		pickDate: label(data.labels, 'PickDate')
	}));

	// The page language is a label too; with none, the page stays `en`.
	$effect(() => {
		if (data.labels.Lang) document.documentElement.lang = data.labels.Lang;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<SkipLink />

<!-- layer.safe-area: page-color strip over the top inset, above the sticky bar. -->
<div
	aria-hidden="true"
	class="pointer-events-none fixed inset-x-0 top-0 z-(--layer-safe-area) h-[env(safe-area-inset-top)] bg-background"
></div>

<div class="min-h-dvh bg-background text-foreground">
	{@render children()}
	<Signature label={label(data.labels, 'Signature')} />
</div>
