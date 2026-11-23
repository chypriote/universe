<script lang="ts">
	let { title, subtitle }: { title: string; subtitle: string } = $props();
</script>

<span class="grid min-w-0 px-0.5 pt-2">
	<span class="truncate display-type text-sm leading-snug font-extrabold tracking-caption">
		{title}
	</span>
	<span class="truncate text-2xs leading-snug font-medium text-muted-foreground">{subtitle}</span>
</span>
