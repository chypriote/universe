<script lang="ts">
	import { cn } from '../utils.js';

	let { message, class: className }: { message: string; class?: string } = $props();
</script>

<p class={cn('text-sm font-bold text-destructive', className)} role="alert">! {message}</p>
