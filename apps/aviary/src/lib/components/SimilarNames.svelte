<script lang="ts">
	import BirdPicture from './BirdPicture.svelte';
	import { label, type Labels } from '#lib/labels';
	import { initials, tintClass } from '#lib/tile';
	import type { SimilarBird } from '#lib/server/catalog/types';

	/** Small tiles of Birds whose name matches `text` (3 characters or more), Archived included. */
	let { text, labels }: { text: string; labels: Labels } = $props();

	let found = $state<SimilarBird[]>([]);

	$effect(() => {
		const query = text.trim();
		if ([...query].length < 3) {
			found = [];
			return;
		}
		// A later keystroke cancels this lookup and any answer that comes back late.
		const controller = new AbortController();
		const timer = setTimeout(async () => {
			try {
				const response = await fetch(`/api/similar?q=${encodeURIComponent(query)}`, {
					signal: controller.signal
				});
				if (response.ok) found = await response.json();
			} catch {
				// Offline or cancelled: saving stays possible, so the hint just stays as it was.
			}
		}, 250);
		return () => {
			clearTimeout(timer);
			controller.abort();
		};
	});
</script>

{#if found.length > 0}
	<div class="flex flex-col gap-1.5" aria-live="polite">
		<span class="text-sm font-bold">{label(labels, 'SimilarNames')}</span>
		<ul class="flex flex-wrap gap-2">
			{#each found as bird (bird.id)}
				<li class="flex w-16 flex-col gap-0.5">
					{#if bird.pictureId !== null}
						<BirdPicture
							pictureId={bird.pictureId}
							class="aspect-square w-full rounded-md object-cover {bird.archived
								? 'opacity-50'
								: ''}"
						/>
					{:else}
						<span
							class="flex aspect-square w-full items-center justify-center rounded-md text-sm font-bold {tintClass(
								bird.name
							)}"
						>
							{initials(bird.name)}
						</span>
					{/if}
					<span class="truncate text-xs">{bird.name}</span>
					{#if bird.archived}
						<span class="text-xs text-muted-foreground">{label(labels, 'Archived')}</span>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
{/if}
