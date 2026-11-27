<script lang="ts">
	import { enhance } from '$app/forms';
	import Parakeets from '#lib/components/Parakeets.svelte';
	import Button from '@universe/showcase/components/Button.svelte';
	import Field from '@universe/showcase/components/Field.svelte';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let password = $state('');
	let busy = $state(false);
</script>

<svelte:head><title>Log in</title></svelte:head>

<div class="flex min-h-dvh flex-col">
	<main id="main" class="flex flex-1 items-center justify-center px-4 py-12">
		<form
			method="POST"
			class="flex w-full max-w-xs flex-col gap-4"
			use:enhance={({ formData }) => {
				// Field has no `name`: the bound value is what is sent.
				formData.set('password', password);
				busy = true;
				return async ({ update }) => {
					busy = false;
					await update({ reset: false });
				};
			}}
		>
			<h1>Log in</h1>
			<Field
				label="Password"
				type="password"
				required
				autocomplete="current-password"
				bind:value={password}
				error={form?.error ?? null}
			/>
			<Button intent="success" type="submit" loading={busy}>Log in</Button>
		</form>
	</main>
	<Parakeets />
</div>
