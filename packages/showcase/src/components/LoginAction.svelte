<script lang="ts">
	import Button from './Button.svelte';
	import LoginForm from './LoginForm.svelte';
	import { Button as UiButton } from './ui/button/index.js';
	import * as Dialog from './ui/dialog/index.js';

	let {
		isOwner,
		adminHref
	}: {
		isOwner: boolean;
		/** The app's admin page, already resolved (`resolve('/admin')`). */
		adminHref: string;
	} = $props();

	let loginOpen = $state(false);
</script>

{#if isOwner}
	<UiButton variant="neutral" size="icon-sm" href={adminHref}>
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			class="size-4"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
			/>
			<circle cx="12" cy="12" r="3" />
		</svg>
		<span class="sr-only">Admin</span>
	</UiButton>
{:else}
	<Button intent="neutral" size="icon-sm" onclick={() => (loginOpen = true)}>
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			class="size-4"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="4" y="11" width="16" height="10" rx="2" />
			<path d="M8 11V7a4 4 0 0 1 8 0v4" />
		</svg>
		<span class="sr-only">Owner login</span>
	</Button>

	<Dialog.Root bind:open={loginOpen}>
		<Dialog.Content>
			<Dialog.Title>Owner login</Dialog.Title>
			<LoginForm onSuccess={() => (loginOpen = false)} />
		</Dialog.Content>
	</Dialog.Root>
{/if}
