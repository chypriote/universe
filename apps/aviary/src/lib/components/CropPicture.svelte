<script lang="ts">
	import { onDestroy } from 'svelte';
	import Button from '@universe/showcase/components/Button.svelte';
	import { MAX_ZOOM, panCrop, squareCrop, zoomCrop, zoomOf, type Crop } from '#lib/image-prep';

	/**
	 * The square crop of one file: drag the picture to move it, the slider to zoom. `onUse`
	 * gets the crop in image pixels. The file is shown by the browser, so its EXIF turn applies.
	 */
	let {
		file,
		busy = false,
		onUse,
		onSkip,
		onUnreadable
	}: {
		file: Blob;
		busy?: boolean;
		onUse: (crop: Crop) => void;
		onSkip: () => void;
		onUnreadable: () => void;
	} = $props();

	const url = URL.createObjectURL(file);
	onDestroy(() => URL.revokeObjectURL(url));
	let width = $state(0);
	let height = $state(0);
	let crop = $state<Crop | null>(null);
	let box = $state(0);
	let drag: { x: number; y: number } | null = null;

	// `crop` is set once the image has loaded.
	const zoom = $derived(crop ? zoomOf(crop, width, height) : 1);
	const scale = $derived(crop && box ? box / crop.side : 1);

	function loaded(event: Event) {
		const img = event.currentTarget as HTMLImageElement;
		width = img.naturalWidth;
		height = img.naturalHeight;
		crop = squareCrop(width, height);
	}

	function down(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		drag = { x: event.clientX, y: event.clientY };
	}

	function move(event: PointerEvent) {
		if (!drag || !crop) return;
		crop = panCrop(
			crop,
			width,
			height,
			-(event.clientX - drag.x) / scale,
			-(event.clientY - drag.y) / scale
		);
		drag = { x: event.clientX, y: event.clientY };
	}

	function setZoom(event: Event) {
		if (crop)
			crop = zoomCrop(crop, width, height, Number((event.target as HTMLInputElement).value));
	}
</script>

<div class="flex flex-col items-center gap-3 rounded-md border border-input p-3">
	<div
		bind:clientWidth={box}
		class="relative aspect-square w-full max-w-72 cursor-grab touch-none overflow-hidden rounded-md bg-muted"
		role="presentation"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={() => (drag = null)}
		onpointercancel={() => (drag = null)}
	>
		<img
			src={url}
			alt=""
			draggable="false"
			onload={loaded}
			onerror={onUnreadable}
			class="pointer-events-none absolute max-w-none select-none"
			style={crop
				? `width:${width * scale}px;height:${height * scale}px;left:${-crop.sx * scale}px;top:${-crop.sy * scale}px`
				: 'visibility:hidden'}
		/>
	</div>
	<input
		type="range"
		min="1"
		max={MAX_ZOOM}
		step="0.01"
		value={zoom}
		oninput={setZoom}
		disabled={!crop}
		class="w-full max-w-72 accent-icon-accent"
		aria-label="Zoom"
	/>
	<div class="flex gap-2">
		<Button onclick={onSkip}>Cancel</Button>
		<Button intent="success" loading={busy} disabled={!crop} onclick={() => crop && onUse(crop)}>
			Save
		</Button>
	</div>
</div>
