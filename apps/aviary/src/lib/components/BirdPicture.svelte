<script lang="ts">
	import { storeThumb, thumbUrl } from '#lib/thumb';

	let {
		pictureId,
		class: className = '',
		onFail
	}: {
		pictureId: number;
		class?: string;
		/** The full picture failed too. */
		onFail?: () => void;
	} = $props();

	// The small copy first. A Picture with none loads in full once; the browser then stores the small copy.
	let full = $state(false);
	let img = $state<HTMLImageElement | null>(null);

	// A new Picture starts from its small copy again.
	$effect(() => {
		void pictureId;
		full = false;
	});

	function failed() {
		if (full) onFail?.();
		else full = true;
	}

	// An image can fail before hydration, so the error event is already gone.
	$effect(() => {
		if (img && img.complete && img.naturalWidth === 0) failed();
	});
</script>

<img
	bind:this={img}
	src={full ? `/pictures/${pictureId}` : thumbUrl(pictureId)}
	alt=""
	loading="lazy"
	class={className}
	onerror={failed}
	onload={() => full && img && storeThumb(pictureId, img)}
/>
