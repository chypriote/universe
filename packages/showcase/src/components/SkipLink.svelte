<script lang="ts">
	import { getUiLabels } from '../ui-labels.js';

	const ui = getUiLabels();
</script>

<a
	href="#main"
	class="sr-only z-(--layer-popup) rounded-control bg-card px-4 py-3 text-sm font-bold text-foreground shadow-(--shadow-raised) outline-ring focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus-visible:outline-3 focus-visible:outline-solid"
>
	{ui().skipToContent}
</a>
