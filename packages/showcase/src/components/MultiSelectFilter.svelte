<script lang="ts">
	import { Button } from './ui/button/index.js';

	type Group = { label?: string; options: { value: string; label: string }[] };

	let {
		value = $bindable([]),
		label,
		groups
	}: {
		/** Picked option values. Empty = all. */
		value?: string[];
		/** Plural, capitalised: "Countries" gives "All countries (12)" and "Countries (3)". */
		label: string;
		/** A group with a label gets a heading that picks or clears all its options. */
		groups: Group[];
	} = $props();

	const values = (group: Group) => group.options.map((o) => o.value);
	const picked = (ids: string[]) => ids.filter((id) => value.includes(id)).length;

	function toggleGroup(ids: string[], on: boolean) {
		value = on ? [...new Set([...value, ...ids])] : value.filter((id) => !ids.includes(id));
	}

	const total = $derived(groups.reduce((n, g) => n + g.options.length, 0));

	let details = $state<HTMLDetailsElement>();
	let summary = $state<HTMLElement>();

	function closeOnEscape(e: KeyboardEvent) {
		if (e.key !== 'Escape' || !details?.open) return;
		details.open = false;
		summary?.focus();
	}
</script>

<!-- Catches Esc from the pill and from every checkbox in the list. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<details bind:this={details} onkeydown={closeOnEscape} class="relative">
	<summary
		bind:this={summary}
		class="flex min-h-11 cursor-pointer list-none items-center rounded-control bg-card px-4 text-sm font-bold text-foreground shadow-(--shadow-raised) outline-ring focus-visible:outline-3 focus-visible:outline-solid [&::-webkit-details-marker]:hidden"
	>
		{value.length ? `${label} (${value.length})` : `All ${label.toLowerCase()} (${total})`}
	</summary>
	<div
		class="absolute start-0 top-full z-(--layer-sticky) mt-2 max-h-[60vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-md bg-card shadow-(--shadow-raised)"
	>
		<div class="sticky top-0 z-10 bg-card px-4 py-2">
			<Button
				variant="neutral"
				class="w-full"
				disabled={value.length === 0}
				onclick={() => (value = [])}
			>
				Clear filter
			</Button>
		</div>
		<!-- autocomplete off: the browser must not restore stale checks on reload. -->
		<div class="grid gap-3 px-4 pb-3">
			{#each groups as group, i (group.label ?? i)}
				{@const ids = values(group)}
				{@const count = picked(ids)}
				<fieldset>
					{#if group.label}
						<legend
							class="mb-1 w-full display-type text-sm leading-tight font-bold tracking-label text-muted-foreground"
						>
							<label class="flex min-h-11 cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									autocomplete="off"
									checked={count === ids.length}
									indeterminate={count > 0 && count < ids.length}
									onchange={(e) => toggleGroup(ids, e.currentTarget.checked)}
									class="size-5 accent-icon-accent"
								/>
								{group.label}
							</label>
						</legend>
					{/if}
					{#each group.options as option (option.value)}
						<label
							class="flex min-h-11 cursor-pointer items-center gap-2 text-sm {group.label
								? 'ps-7'
								: ''}"
						>
							<input
								type="checkbox"
								autocomplete="off"
								value={option.value}
								bind:group={value}
								class="size-5 accent-icon-accent"
							/>
							{option.label}
						</label>
					{/each}
				</fieldset>
			{/each}
		</div>
	</div>
</details>
