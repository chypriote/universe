<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShowcasePopup from '@universe/showcase/components/Popup.svelte';
	import { initials, tileClass } from '#lib/tile';

	let {
		open = $bindable(false),
		anchor = null,
		album,
		artist = '',
		coverUrl = null,
		wide = false,
		large = false,
		onDismiss,
		details,
		below,
		actions
	}: {
		open?: boolean;
		/** The Cover that opened the Popup. A Cover Popup opens over it; focus goes back to it on close. */
		anchor?: HTMLElement | null;
		album: string;
		/** Empty for a form Popup: no cover tile and no subtitle. */
		artist?: string;
		coverUrl?: string | null;
		/** A wider Popup without a cover, for the cover picker. */
		wide?: boolean;
		/** A bigger card: the cover takes the full height and the actions sit bottom right. */
		large?: boolean;
		onDismiss?: () => void;
		details?: Snippet;
		/** Full width under the cover and details, above the actions. */
		below?: Snippet;
		actions?: Snippet;
	} = $props();

	let imgFailed = $state(false);
	$effect(() => {
		void coverUrl;
		imgFailed = false;
	});
</script>

{#snippet cover()}
	{#if large}
		<div
			class="relative mx-auto aspect-square w-full max-w-72 sm:aspect-auto sm:min-h-[min(var(--popup-cover-size-large),34vw)] sm:max-w-none sm:flex-1"
		>
			{#if coverUrl && !imgFailed}
				<img
					src={coverUrl}
					alt=""
					class="absolute inset-0 size-full rounded-2xl object-cover shadow-(--shadow-raised)"
					onerror={() => (imgFailed = true)}
				/>
			{:else}
				<span
					aria-hidden="true"
					class="absolute inset-0 flex items-center justify-center rounded-2xl text-6xl font-extrabold text-primary-foreground shadow-(--shadow-raised) {tileClass(
						artist
					)}"
				>
					{initials(artist)}
				</span>
			{/if}
		</div>
	{:else if coverUrl && !imgFailed}
		<img
			src={coverUrl}
			alt=""
			class="mx-auto aspect-square w-full max-w-72 rounded-2xl object-cover shadow-(--shadow-raised) sm:max-w-none"
			onerror={() => (imgFailed = true)}
		/>
	{:else}
		<span
			aria-hidden="true"
			class="mx-auto flex aspect-square w-full max-w-72 items-center justify-center rounded-2xl text-4xl font-extrabold text-primary-foreground shadow-(--shadow-raised) sm:max-w-none {tileClass(
				artist
			)}"
		>
			{initials(artist)}
		</span>
	{/if}
{/snippet}

<ShowcasePopup
	bind:open
	{anchor}
	title={album}
	subtitle={artist}
	{wide}
	{large}
	{onDismiss}
	{details}
	{below}
	{actions}
	class={artist && !large && !wide ? 'max-w-2xl' : undefined}
	mediaWidth={large
		? 'min(var(--popup-cover-size-large), 34vw)'
		: 'min(var(--popup-cover-size), 28vw)'}
	stackMedia
	media={artist && !wide ? cover : undefined}
/>
