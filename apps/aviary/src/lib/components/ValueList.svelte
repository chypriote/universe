<script lang="ts">
	import { enhance } from '$app/forms';
	import { label, type Labels } from '#lib/labels';
	import type { ListValue, ValueKind } from '#lib/server/catalog/types';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import Button from '@universe/showcase/components/Button.svelte';
	import ConfirmDialog from '@universe/showcase/components/ConfirmDialog.svelte';
	import ErrorMessage from '@universe/showcase/components/ErrorMessage.svelte';
	import Field from '@universe/showcase/components/Field.svelte';
	import Select from '@universe/showcase/components/Select.svelte';

	let {
		kind,
		heading,
		values,
		labels,
		error = null
	}: {
		kind: ValueKind;
		heading: string;
		values: ListValue[];
		labels: Labels;
		/** Label code name of the last refusal on this list. */
		error?: string | null;
	} = $props();

	let newName = $state('');
	/** The value being removed, once it is in use and a target must be picked. */
	let removing = $state<ListValue | null>(null);
	let target = $state('');
	let removeForm = $state<HTMLFormElement | null>(null);
	let removeId = $state(0);
	let removeTarget = $state('');

	const targets = $derived(
		values.filter((v) => v.id !== removing?.id).map((v) => ({ value: String(v.id), label: v.name }))
	);

	function remove(value: ListValue) {
		if (value.uses === 0) {
			submitRemove(value.id, '');
			return;
		}
		removing = value;
		target = values.find((v) => v.id !== value.id)?.id.toString() ?? '';
	}

	function submitRemove(id: number, moveTo: string) {
		removeId = id;
		removeTarget = moveTo;
		// Wait for the hidden inputs to take the new values.
		queueMicrotask(() => removeForm?.requestSubmit());
	}
</script>

<section class="flex flex-col gap-3" aria-labelledby="{kind}-heading">
	<h2 id="{kind}-heading">{heading}</h2>

	{#if error}<ErrorMessage message={label(labels, error)} />{/if}

	<ul class="flex flex-col gap-2">
		{#each values as value (value.id)}
			<li class="flex items-center gap-2">
				<form
					method="POST"
					action="?/rename"
					use:enhance
					class="flex min-w-0 flex-1 items-center gap-2"
				>
					<input type="hidden" name="kind" value={kind} />
					<input type="hidden" name="id" value={value.id} />
					<input
						name="name"
						value={value.name}
						aria-label={label(labels, 'Rename')}
						class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3"
					/>
					<span class="text-sm text-muted-foreground">{value.uses}</span>
					<span title={label(labels, 'Rename')}>
						<Button type="submit" size="icon-sm">
							<PencilIcon class="size-4" aria-hidden="true" />
							<span class="sr-only">{label(labels, 'Rename')}</span>
						</Button>
					</span>
				</form>
				<span title={label(labels, 'Remove')}>
					<Button intent="danger" size="icon-sm" onclick={() => remove(value)}>
						<Trash2Icon class="size-4" aria-hidden="true" />
						<span class="sr-only">{label(labels, 'Remove')}</span>
					</Button>
				</span>
			</li>
		{:else}
			<li class="text-sm text-muted-foreground">{label(labels, 'NoValues')}</li>
		{/each}
	</ul>

	<form
		method="POST"
		action="?/add"
		use:enhance={() =>
			async ({ result, update }) => {
				await update();
				if (result.type === 'success') newName = '';
			}}
		class="flex items-end gap-2"
	>
		<input type="hidden" name="kind" value={kind} />
		<input type="hidden" name="name" value={newName} />
		<div class="flex-1"><Field bind:value={newName} label={label(labels, 'Add')} /></div>
		<span title={label(labels, 'Add')}>
			<Button type="submit" intent="success" size="icon">
				<PlusIcon class="size-5" aria-hidden="true" />
				<span class="sr-only">{label(labels, 'Add')}</span>
			</Button>
		</span>
	</form>

	<form method="POST" action="?/remove" use:enhance bind:this={removeForm} class="hidden">
		<input type="hidden" name="kind" value={kind} />
		<input type="hidden" name="id" value={removeId} />
		<input type="hidden" name="moveTo" value={removeTarget} />
	</form>

	<ConfirmDialog
		open={removing !== null}
		title={label(labels, 'MoveBeforeRemove')}
		text={removing ? `${removing.name} (${removing.uses})` : ''}
		actionLabel={label(labels, 'Remove')}
		actionDisabled={!target}
		onConfirm={() => {
			if (removing) submitRemove(removing.id, target);
			removing = null;
		}}
	>
		<Select bind:value={target} label={label(labels, 'MoveTo')} options={targets} />
	</ConfirmDialog>
</section>
