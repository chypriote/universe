<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '../utils.js';
	import * as Dialog from './ui/dialog/index.js';

	let {
		open = $bindable(false),
		anchor = null,
		title,
		subtitle = '',
		wide = false,
		large = false,
		mediaWidth = 'var(--popup-picture-size)',
		stackMedia = false,
		class: className,
		onDismiss,
		media,
		details,
		below,
		actions
	}: {
		open?: boolean;
		/** The tile that opened the Popup. A detail Popup opens over it; focus goes back to it on close. */
		anchor?: HTMLElement | null;
		title: string;
		/** Under the title of a detail Popup. */
		subtitle?: string;
		/** Form Popup: `popup-width-wide`, no media. */
		wide?: boolean;
		/** A bigger detail card: more room, the actions bottom right of the details. */
		large?: boolean;
		/** CSS width of the media column, e.g. `min(var(--popup-cover-size), 28vw)`. */
		mediaWidth?: string;
		/** Below `sm`, the media sits above the details instead of beside them. */
		stackMedia?: boolean;
		class?: string;
		/** X button, Esc, tap on the backdrop. */
		onDismiss?: () => void;
		/** The thing's picture: set it for a detail Popup. */
		media?: Snippet;
		details?: Snippet;
		/** Full width under the media and details, above the actions. */
		below?: Snippet;
		actions?: Snippet;
	} = $props();

	const detail = $derived(!!media && !wide);

	function onOpenChange(next: boolean) {
		if (!next) onDismiss?.();
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content
		class={cn(wide && 'max-w-(--popup-width-wide)', detail && large && 'max-w-3xl p-6', className)}
		placeOver={detail ? anchor : null}
		onCloseAutoFocus={(e: Event) => {
			if (anchor?.isConnected) {
				e.preventDefault();
				anchor.focus();
			}
		}}
	>
		{#if detail}
			<div
				class={cn(
					'grid gap-4',
					stackMedia
						? 'grid-cols-1 sm:grid-cols-[minmax(0,var(--popup-media))_minmax(0,1fr)]'
						: 'grid-cols-[minmax(0,var(--popup-media))_minmax(0,1fr)]',
					large && 'sm:gap-6'
				)}
				style="--popup-media: {mediaWidth}"
			>
				<div class="flex min-w-0 flex-col gap-2">{@render media?.()}</div>
				<div class="flex min-w-0 flex-col gap-0.5">
					<Dialog.Title class="[overflow-wrap:anywhere]">{title}</Dialog.Title>
					{#if subtitle}
						<Dialog.Description class="mb-2">{subtitle}</Dialog.Description>
					{/if}
					{@render details?.()}
					{#if large && actions}
						<Dialog.Footer class="mt-auto justify-end pt-4">{@render actions()}</Dialog.Footer>
					{/if}
				</div>
			</div>
			{@render below?.()}
		{:else}
			<Dialog.Title>{title}</Dialog.Title>
			{@render details?.()}
		{/if}
		{#if actions && !(detail && large)}
			<Dialog.Footer>{@render actions()}</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
