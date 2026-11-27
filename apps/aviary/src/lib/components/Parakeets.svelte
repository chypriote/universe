<script lang="ts">
	// Types only: the snippet below takes a typed argument.
</script>

<!--
	The login page art: static parakeets peeking up from the bottom edge. Decorative, no data.
	Colours come from the --parakeet-* variables. Below `sm`: three, smaller, and in the flow under
	the form, so they never cover it.
-->
{#snippet parakeet(flip: boolean)}
	<svg
		viewBox="0 0 80 64"
		aria-hidden="true"
		class="w-full"
		style:transform={flip ? 'scaleX(-1)' : undefined}
	>
		<!-- Body: a round head, cut by the bottom edge. -->
		<path
			d="M8 64 C8 30 22 12 42 12 C62 12 72 30 72 64 Z"
			style="fill: var(--parakeet-body); stroke: var(--parakeet-outline)"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<!-- Crest tuft. -->
		<path
			d="M38 14 C36 6 40 2 46 1 C44 5 46 9 48 13"
			style="fill: var(--parakeet-body); stroke: var(--parakeet-outline)"
			stroke-width="3"
			stroke-linejoin="round"
		/>
		<!-- Wing. -->
		<path d="M14 64 C14 48 22 40 34 40 C32 52 28 60 24 64 Z" style="fill: var(--parakeet-wing)" />
		<!-- Beak and eye. -->
		<path d="M56 30 L68 36 L56 42 Z" style="fill: var(--parakeet-beak)" />
		<circle cx="52" cy="28" r="4" style="fill: var(--parakeet-beak)" />
	</svg>
{/snippet}

<div
	aria-hidden="true"
	class="pointer-events-none flex items-end justify-around gap-2 px-4 sm:px-12"
>
	{#each [0, 1, 2, 3, 4] as index (index)}
		<div
			class="w-20 sm:w-28 lg:w-36 {index === 1 || index === 3 ? 'max-sm:hidden' : ''}"
			style:margin-bottom={index % 2 ? '-6px' : undefined}
		>
			{@render parakeet(index % 2 === 1)}
		</div>
	{/each}
</div>
