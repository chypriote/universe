<script lang="ts">
	import EggIcon from '@lucide/svelte/icons/egg';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import MapPinOffIcon from '@lucide/svelte/icons/map-pin-off';
	import PlaneTakeoffIcon from '@lucide/svelte/icons/plane-takeoff';
	import BirdPicture from './BirdPicture.svelte';
	import TileCaption from '@universe/showcase/components/TileCaption.svelte';
	import { formatDate } from '@universe/universe/format';
	import { label, type Labels } from '#lib/labels';
	import { initials, tintClass } from '#lib/tile';
	import type { BirdTile } from '#lib/server/catalog/types';

	let {
		bird,
		labels,
		onSelect
	}: {
		bird: BirdTile;
		labels: Labels;
		/** Gives the Popup the tile to focus on close. */
		onSelect?: (el: HTMLElement) => void;
	} = $props();

	let failed = $state(false);
	const showImage = $derived(bird.pictureId !== null && !failed);

	// One colour-coded icon per flag. Roosted is never shown.
	const flags = $derived(
		[
			{ on: bird.seen, code: 'Seen', icon: EyeIcon, color: 'text-info' },
			{ on: bird.flown, code: 'Flown', icon: PlaneTakeoffIcon, color: 'text-success' },
			{ on: bird.lost, code: 'Lost', icon: MapPinOffIcon, color: 'text-destructive' },
			{ on: bird.nest, code: 'Nest', icon: EggIcon, color: 'text-highlight' }
		].filter((flag) => flag.on)
	);
</script>

<li class="min-w-0">
	<button
		type="button"
		class="group flex w-full min-w-0 cursor-pointer flex-col rounded-md text-start outline-ring outline-offset-3 focus-visible:outline-3 focus-visible:outline-solid"
		onclick={(e) => onSelect?.(e.currentTarget)}
	>
		<span
			class="relative block aspect-square w-full overflow-hidden rounded-(--cover-radius) shadow-(--shadow-raised) motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-(--easing-out) motion-safe:group-hover:translate-y-(--tile-hover-lift) motion-safe:group-hover:rotate-(--tile-hover-tilt) motion-safe:group-focus-visible:translate-y-(--tile-hover-lift) motion-safe:group-focus-visible:rotate-(--tile-hover-tilt)"
		>
			{#if showImage}
				<BirdPicture
					pictureId={bird.pictureId!}
					class="size-full object-cover"
					onFail={() => (failed = true)}
				/>
			{:else}
				<span
					class="flex size-full items-center justify-center text-2xl font-extrabold text-primary-foreground {tintClass(
						bird.name
					)}"
					aria-hidden="true"
				>
					{initials(bird.name)}
				</span>
			{/if}
			{#if flags.length > 0}
				<span class="absolute start-1 top-1 flex gap-0.5 drop-shadow-(--flag-shadow)">
					{#each flags as flag (flag.code)}
						<flag.icon class="size-4 {flag.color}" aria-hidden="true" />
						<span class="sr-only">{label(labels, flag.code)}</span>
					{/each}
				</span>
			{/if}
		</span>
		<TileCaption title={bird.name} subtitle={bird.arrival ? formatDate(bird.arrival) : ''} />
	</button>
</li>
