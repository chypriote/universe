<script lang="ts">
	import { resolve } from '$app/paths';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { Button } from '@universe/showcase/ui/button';

	let { label }: { label: string } = $props();
</script>

<Button variant="neutral" size="icon-sm" href={resolve('/admin')}>
	<SettingsIcon aria-hidden="true" class="size-4" />
	<span class="sr-only">{label}</span>
</Button>
