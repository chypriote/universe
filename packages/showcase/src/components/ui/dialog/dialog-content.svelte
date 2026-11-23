<script lang="ts">
	import { Dialog as DialogPrimitive } from 'bits-ui';
	import XIcon from '@lucide/svelte/icons/x';
	import { cn, type WithoutChildrenOrChild } from '../../../utils.js';
	import DialogOverlay from './dialog-overlay.svelte';
	import DialogPortal from './dialog-portal.svelte';
	import type { Snippet } from 'svelte';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		showCloseButton = true,
		placeOver = null,
		...restProps
	}: WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DialogPortal>>;
		children: Snippet;
		showCloseButton?: boolean;
		/** Open over this element (the tapped tile), clamped to the screen. Without it: centred. */
		placeOver?: HTMLElement | null;
	} = $props();

	const GUTTER = 16;
	let pos = $state<{ left: number; top: number } | null>(null);

	$effect(() => {
		const el = ref;
		const target = placeOver;
		if (!el || !target) {
			pos = null;
			return;
		}
		function place() {
			if (!el || !target) return;
			const r = target.getBoundingClientRect();
			const w = el.offsetWidth;
			const h = el.offsetHeight;
			const left = Math.min(
				Math.max(r.left + r.width / 2 - w / 2, GUTTER),
				Math.max(window.innerWidth - w - GUTTER, GUTTER)
			);
			const top = Math.min(
				Math.max(r.top, GUTTER),
				Math.max(window.innerHeight - h - GUTTER, GUTTER)
			);
			pos = { left, top };
		}
		place();
		// The popup grows when its picture loads: keep it on screen.
		const observer = new ResizeObserver(place);
		observer.observe(el);
		window.addEventListener('resize', place);
		return () => {
			observer.disconnect();
			window.removeEventListener('resize', place);
		};
	});
</script>

<DialogPortal {...portalProps}>
	<DialogOverlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="dialog-content"
		class={cn(
			'fixed top-1/2 left-1/2 z-(--layer-popup) grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-(--popup-width-max) -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl bg-card p-[18px] text-foreground shadow-(--shadow-popup) outline-none data-[state=closed]:opacity-0 motion-safe:transition-opacity motion-safe:duration-150',
			className
		)}
		style={pos ? `left:${pos.left}px;top:${pos.top}px;translate:none` : undefined}
		{...restProps}
	>
		{@render children?.()}
		{#if showCloseButton}
			<DialogPrimitive.Close
				data-slot="dialog-close"
				class="absolute end-3 top-3 inline-flex size-11 cursor-pointer items-center justify-center rounded-full bg-background text-foreground outline-ring hover:bg-muted focus-visible:outline-3 focus-visible:outline-solid"
			>
				<XIcon class="size-5" />
				<span class="sr-only">Close</span>
			</DialogPrimitive.Close>
		{/if}
	</DialogPrimitive.Content>
</DialogPortal>
