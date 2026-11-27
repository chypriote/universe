<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '@universe/showcase/ui/badge';
	import Button from '@universe/showcase/components/Button.svelte';
	import ShowcasePopup from '@universe/showcase/components/Popup.svelte';
	import { formatDate } from '@universe/universe/format';
	import { birdToForm } from '#lib/bird-form';
	import ConfirmDialog from '@universe/showcase/components/ConfirmDialog.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import { label, type Labels } from '#lib/labels';
	import { postForm } from '#lib/post-form';
	import type { PictureItem } from '#lib/picture-list';
	import type { BirdDetail } from '#lib/server/catalog/types';
	import { initials, tintClass } from '#lib/tile';
	import BirdForm from './BirdForm.svelte';
	import SightingList from './SightingList.svelte';

	let {
		open = $bindable(false),
		anchor = null,
		birdId,
		name,
		labels,
		onChanged
	}: {
		open?: boolean;
		anchor?: HTMLElement | null;
		birdId: number;
		/** The tile's name, shown while the Bird loads. */
		name: string;
		labels: Labels;
		/** A Sighting changed Seen: the grid reloads. */
		onChanged?: () => void;
	} = $props();

	let bird = $state<BirdDetail | null>(null);
	let loadError = $state(false);
	let shown = $state(0);
	let editing = $state(false);

	// Every tab page loads the two lists, as for Add.
	const habitats = $derived((page.data.habitats ?? []) as { id: number; name: string }[]);
	const songs = $derived((page.data.songs ?? []) as { id: number; name: string }[]);
	const storedPictures = $derived<PictureItem[]>(
		(bird?.pictureIds ?? []).map((id) => ({ key: `stored-${id}`, id, url: `/pictures/${id}` }))
	);

	/** The form closes, the Bird and the grid reload, the popup shows the change. */
	async function doneEditing() {
		editing = false;
		await changed();
	}

	let archiveError = $state<string | null>(null);
	let archiving = $state(false);
	let confirmingArchive = $state(false);

	/** The Bird leaves every tab: the form and the popup close, the grid reloads. */
	async function archive() {
		archiving = true;
		archiveError = null;
		const outcome = await postForm(`?/archiveBird&id=${birdId}`, new FormData());
		archiving = false;
		if (!outcome.ok) {
			archiveError = outcome.error;
			return;
		}
		editing = false;
		open = false;
		onChanged?.();
	}

	let loading: AbortController | null = null;

	async function load() {
		loading?.abort();
		const request = new AbortController();
		loading = request;
		const id = birdId;
		try {
			const response = await fetch(`/api/birds/${id}`, { signal: request.signal });
			if (request.signal.aborted || id !== birdId) return;
			if (response.status === 401) {
				window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
				return;
			}
			if (!response.ok) {
				loadError = true;
				return;
			}
			const loaded: BirdDetail = await response.json();
			if (request.signal.aborted || id !== birdId) return;
			bird = loaded;
			loadError = false;
		} catch {
			// A superseded request was aborted on purpose; any other failure shows the error.
			if (!request.signal.aborted && id === birdId) loadError = true;
		}
	}

	$effect(() => {
		void birdId;
		bird = null;
		shown = 0;
		archiveError = null;
		load();
	});

	async function change(body: Record<string, unknown>): Promise<string | null> {
		const response = await fetch('/api/sightings', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ ...body, birdId })
		});
		if (response.status === 401) {
			window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
			return 'Unauthorized';
		}
		if (response.ok) return null;
		const failure = (await response.json().catch(() => null)) as { error?: string } | null;
		return failure?.error ?? 'bad-request';
	}

	async function changed() {
		await load();
		onChanged?.();
	}

	// Flags as read-only tags. Roosted shows here, though never on a tile.
	const flags = $derived(
		bird
			? [
					{ on: bird.seen, code: 'Seen', variant: 'info' },
					{ on: bird.flown, code: 'Flown', variant: 'success' },
					{ on: bird.lost, code: 'Lost', variant: 'default' },
					{ on: bird.roosted, code: 'Roosted', variant: 'default' },
					{ on: bird.nest, code: 'Nest', variant: 'highlight' }
				].filter((flag) => flag.on)
			: []
	);
	const facts = $derived(
		[bird?.habitat, bird?.arrival ? formatDate(bird.arrival) : null].filter(Boolean).join(' · ')
	);
</script>

{#snippet media()}
	{#if bird && bird.pictureIds.length > 0}
		<span class="block aspect-square overflow-hidden rounded-md bg-background">
			<img src="/pictures/{bird.pictureIds[shown]}" alt="" class="size-full object-cover" />
		</span>
		{#if bird.pictureIds.length > 1}
			<div class="flex flex-wrap gap-1" role="group">
				{#each bird.pictureIds as pictureId, index (pictureId)}
					<button
						type="button"
						class="size-(--control-size-min) cursor-pointer overflow-hidden rounded-md bg-background outline-ring focus-visible:outline-3 focus-visible:outline-solid aria-pressed:ring-3 aria-pressed:ring-icon-accent"
						aria-pressed={shown === index}
						aria-label={`${label(labels, 'Picture')} ${index + 1}`}
						onclick={() => (shown = index)}
					>
						<img src="/pictures/{pictureId}" alt="" class="size-full object-cover" />
					</button>
				{/each}
			</div>
		{/if}
	{:else}
		<span
			class="flex aspect-square items-center justify-center rounded-md text-2xl font-extrabold text-primary-foreground {tintClass(
				name
			)}"
			aria-hidden="true"
		>
			{initials(name)}
		</span>
	{/if}
{/snippet}

{#snippet actions()}
	{#if bird}<Button onclick={() => (editing = true)}>{label(labels, 'EditBird')}</Button>{/if}
{/snippet}

{#snippet details()}
	{#if loadError}
		<p class="font-bold text-destructive" role="alert">! {label(labels, 'BirdLoadError')}</p>
	{:else if bird}
		<div class="flex flex-col gap-3">
			{#if flags.length || bird.songs.length}
				<ul class="mt-2 flex flex-wrap gap-1" aria-label={label(labels, 'Tags')}>
					{#each flags as flag (flag.code)}
						<li>
							<Badge
								class="px-2 py-0.5 text-xs"
								variant={flag.variant as 'default' | 'highlight' | 'success' | 'info'}
							>
								{label(labels, flag.code)}
							</Badge>
						</li>
					{/each}
					{#each bird.songs as song (song)}
						<li><Badge class="px-2 py-0.5 text-xs">{song}</Badge></li>
					{/each}
				</ul>
			{/if}
			<SightingList sightings={bird.sightings} {labels} {change} onChange={changed} />
			{#if bird.notes}
				<p class="text-md [overflow-wrap:anywhere] whitespace-pre-line">{bird.notes}</p>
			{/if}
		</div>
	{/if}
{/snippet}

<ShowcasePopup
	bind:open={() => open && !editing, (value) => (open = value)}
	{anchor}
	title={bird?.name ?? name}
	subtitle={facts}
	mediaWidth="min(var(--popup-picture-size), 40%)"
	{media}
	{details}
	{actions}
/>

<ShowcasePopup
	bind:open={() => open && editing, (value) => (editing = value)}
	title={label(labels, 'EditBird')}
	wide
>
	{#snippet details()}
		{#if editing && bird}
			<BirdForm
				{labels}
				{habitats}
				{songs}
				action="?/editBird&id={birdId}"
				initial={birdToForm(bird)}
				initialPictures={storedPictures}
				seenLocked={bird.sightings.length > 0}
				similar={false}
				onDone={doneEditing}
			>
				{#snippet start()}
					<Button intent="danger" loading={archiving} onclick={() => (confirmingArchive = true)}>
						{label(labels, 'ArchiveBird')}
					</Button>
					{#if archiveError}<ErrorMessage message={label(labels, archiveError)} />{/if}
				{/snippet}
			</BirdForm>
		{/if}
	{/snippet}
</ShowcasePopup>

<ConfirmDialog
	bind:open={confirmingArchive}
	title={label(labels, 'ArchiveBird')}
	text={bird?.name ?? name}
	actionLabel={label(labels, 'ArchiveBird')}
	onConfirm={archive}
/>
