<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShowcasePopup from '@universe/showcase/components/Popup.svelte';
	import MainPicture from './MainPicture.svelte';

	let {
		open = $bindable(false),
		anchor = null,
		title,
		subtitle = '',
		mainPictureUrl = null,
		pictureUrls = [],
		wide = false,
		onDismiss,
		details,
		actions,
		pictureAction
	}: {
		open?: boolean;
		/** The Tile that opened the Popup. A Tile Popup opens over it; focus goes back to it on close. */
		anchor?: HTMLElement | null;
		title: string;
		/** "{season} · {kitType}". Set it for a Tile Popup: the Main Picture shows next to the details. */
		subtitle?: string;
		mainPictureUrl?: string | null;
		/** The Kit's extra Pictures: thumbnails under the Main Picture, a tap shows one in its place. */
		pictureUrls?: string[];
		/** Form Popup: wider, no Main Picture. The form lays out its two columns from `sm`. */
		wide?: boolean;
		/** X button, Esc, tap on the backdrop. */
		onDismiss?: () => void;
		details?: Snippet;
		/** Owner only. */
		actions?: Snippet;
		/** Owner only: on the top right corner of each Picture thumbnail, with its index in `pictureUrls`. */
		pictureAction?: Snippet<[number]>;
	} = $props();

	/** The thumbnail shown in place of the Main Picture. A Kit without a Main Picture has no placeholder thumbnail. */
	let shown = $state(0);
	const thumbnails = $derived(mainPictureUrl ? [mainPictureUrl, ...pictureUrls] : pictureUrls);
	/** The Main Picture is thumbnail 0, so a Picture's place in `pictureUrls` is its thumbnail minus this. */
	const offset = $derived(mainPictureUrl ? 1 : 0);
	$effect(() => {
		void mainPictureUrl;
		void open;
		void pictureUrls.length;
		shown = 0;
	});
</script>

{#snippet picture()}
	<span
		class="flex aspect-3/4 items-center justify-center overflow-hidden rounded-md bg-background"
	>
		<MainPicture url={thumbnails[shown] ?? mainPictureUrl} />
	</span>
	{#if pictureUrls.length}
		<div class="flex flex-wrap gap-1" role="group" aria-label="Pictures">
			{#each thumbnails as url, index (index)}
				<div class="relative">
					<button
						type="button"
						class="flex size-(--control-size-min) items-center justify-center overflow-hidden rounded-md bg-background outline-ring focus-visible:outline-3 focus-visible:outline-solid aria-pressed:outline-3 aria-pressed:outline-solid"
						aria-label={index === 0 && offset ? 'Main picture' : `Picture ${index + 1}`}
						aria-pressed={shown === index}
						onclick={() => (shown = index)}
					>
						<MainPicture {url} />
					</button>
					{#if pictureAction && index >= offset}
						{@render pictureAction(index - offset)}
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<ShowcasePopup
	bind:open
	{anchor}
	{title}
	{subtitle}
	{wide}
	{onDismiss}
	{details}
	{actions}
	mediaWidth="min(var(--popup-picture-size), 40%)"
	media={subtitle && !wide ? picture : undefined}
/>
