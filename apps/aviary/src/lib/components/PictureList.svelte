<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import Button from '@universe/showcase/components/Button.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import { checkFileSize, prepareSquareJpeg } from '#lib/image-prep';
	import CropPicture from './CropPicture.svelte';
	import type { Crop } from '#lib/image-prep';
	import { label, type Labels } from '#lib/labels';
	import { movePicture, removePicture, type PictureItem } from '#lib/picture-list';

	/**
	 * The ordered Pictures of the Bird form, for Add and Edit. Stored Pictures come in with an
	 * `id` and a `url`; every added file is cropped by the user, then resized, before it joins the list.
	 * The first Picture is the tile Picture.
	 */
	let {
		items = $bindable([]),
		labels,
		error = null
	}: { items?: PictureItem[]; labels: Labels; error?: string | null } = $props();

	let input = $state<HTMLInputElement | null>(null);
	let problem = $state<string | null>(null);
	let busy = $state(false);

	/** Files waiting for their crop; the first one is on screen. */
	let queue = $state<File[]>([]);

	function add() {
		const files = [...(input?.files ?? [])];
		if (input) input.value = '';
		if (files.length === 0) return;
		problem = null;
		const accepted: File[] = [];
		for (const file of files) {
			const tooBig = checkFileSize(file.size);
			if (tooBig) problem = tooBig;
			else accepted.push(file);
		}
		queue = [...queue, ...accepted];
	}

	async function crop(file: File, chosen: Crop) {
		busy = true;
		try {
			const blob = await prepareSquareJpeg(file, chosen);
			items = [...items, { key: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) }];
		} catch {
			problem = 'PictureUnreadable';
		}
		busy = false;
		queue = queue.slice(1);
	}

	function remove(index: number) {
		const gone = items[index];
		if (gone?.blob) URL.revokeObjectURL(gone.url);
		items = removePicture(items, index);
	}

	const shown = $derived(problem ?? error);
</script>

<div class="flex flex-col gap-2">
	<span class="text-sm font-bold">{label(labels, 'Pictures')}</span>
	{#if queue[0]}
		{#key queue[0]}
			<CropPicture
				file={queue[0]}
				{busy}
				onUse={(chosen) => crop(queue[0], chosen)}
				onSkip={() => (queue = queue.slice(1))}
				onUnreadable={() => {
					problem = 'PictureUnreadable';
					queue = queue.slice(1);
				}}
			/>
		{/key}
	{/if}
	<ul class="grid grid-cols-3 gap-2 sm:grid-cols-4">
		{#each items as item, i (item.key)}
			<li class="flex flex-col gap-1">
				<img
					src={item.url}
					alt=""
					class="aspect-square w-full rounded-md object-cover {i === 0
						? 'outline-2 outline-icon-accent'
						: ''}"
				/>
				<div class="flex items-center justify-between">
					<Button
						size="icon-sm"
						disabled={i === 0}
						onclick={() => (items = movePicture(items, i, i - 1))}
					>
						<ArrowLeftIcon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'MoveEarlier')}</span>
					</Button>
					<Button
						size="icon-sm"
						disabled={i === items.length - 1}
						onclick={() => (items = movePicture(items, i, i + 1))}
					>
						<ArrowRightIcon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'MoveLater')}</span>
					</Button>
					<Button intent="danger" size="icon-sm" onclick={() => remove(i)}>
						<XIcon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'Remove')}</span>
					</Button>
				</div>
			</li>
		{/each}
	</ul>
	<input bind:this={input} type="file" accept="image/*" multiple class="hidden" onchange={add} />
	<div>
		<Button disabled={queue.length > 0} onclick={() => input?.click()}>
			<PlusIcon class="size-4" aria-hidden="true" />
			{label(labels, 'AddPictures')}
		</Button>
	</div>
	{#if shown}<ErrorMessage message={label(labels, shown)} />{/if}
</div>
