<script lang="ts">
	import BirdList from '#lib/components/BirdList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<BirdList {...data} />
