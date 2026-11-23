<script lang="ts">
	import TileCaption from '@universe/showcase/components/TileCaption.svelte';
	import { initials, tileClass } from '#lib/tile';
	import DesireDots from './DesireDots.svelte';

	let {
		album,
		artist,
		coverUrl = null,
		desire,
		selected,
		onSelect
	}: {
		album: string;
		artist: string;
		coverUrl?: string | null;
		desire?: 1 | 2 | 3 | 4 | 5;
		/** Select mode: set to show a checked state. Leave unset otherwise. */
		selected?: boolean;
		onSelect?: (el: HTMLElement) => void;
	} = $props();

	let failed = $state(false);
	let img = $state<HTMLImageElement | null>(null);
	const showImage = $derived(!!coverUrl && !failed);

	// An image can fail before hydration, so the error event is already gone.
	$effect(() => {
		if (img && img.complete && img.naturalWidth === 0) failed = true;
	});
</script>

<button
	type="button"
	aria-pressed={selected}
	class="group flex min-h-11 w-full cursor-pointer flex-col rounded-(--cover-radius) text-start outline-ring focus-visible:outline-3 focus-visible:outline-solid"
	onclick={(e) => onSelect?.(e.currentTarget)}
>
	<span
		class="block aspect-square w-full overflow-hidden rounded-(--cover-radius) shadow-(--shadow-raised) {selected
			? 'outline-4 outline-offset-2 outline-ring outline-solid'
			: ''} motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-(--easing-out) motion-safe:group-hover:translate-y-(--tile-hover-lift) motion-safe:group-hover:rotate-(--tile-hover-tilt) motion-safe:group-focus-visible:translate-y-(--tile-hover-lift) motion-safe:group-focus-visible:rotate-(--tile-hover-tilt)"
	>
		{#if showImage}
			<img
				bind:this={img}
				src={coverUrl}
				alt=""
				loading="lazy"
				class="size-full object-cover"
				onerror={() => (failed = true)}
			/>
		{:else}
			<span
				class="flex size-full items-center justify-center text-2xl font-extrabold text-primary-foreground {tileClass(
					artist
				)}"
				aria-hidden="true"
			>
				{initials(artist)}
			</span>
		{/if}
	</span>
	<TileCaption title={album} subtitle={artist} />
	{#if desire}
		<span class="px-0.5 pt-1"><DesireDots value={desire} /></span>
	{/if}
</button>
