<script lang="ts">
	import koala from '../koala.svg?url';

	let { size = 20, label = '' }: { size?: number; label?: string } = $props();
</script>

<img src={koala} width={size} height={size} alt={label} class="inline-block shrink-0" />
