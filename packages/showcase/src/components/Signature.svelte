<script lang="ts">
	import Koala from '@universe/universe/svelte/Koala.svelte';

	let { label }: { label: string } = $props();
</script>

<p
	class="flex items-center justify-center gap-2 px-4 pt-6 pb-8 text-sm font-bold text-muted-foreground"
>
	<Koala size={20} />
	{label}
</p>
