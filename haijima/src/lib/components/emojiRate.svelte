<script lang="ts">
	type RatingType = 'overall' | 'quality' | 'delivery' | 'service';

	interface Props {
		value: number;
		onChange: (rating: number) => void;
		type?: RatingType;
	}

	let { value, onChange, type = 'overall' }: Props = $props();

	const emojiSets: Record<RatingType, string[]> = {
		overall: ['😭', '😞', '😐', '🙂', '😁'], // general mood
		quality: ['😭', '😞', '😐', '🙂', '😁'], // food quality
		delivery: ['🐢', '🚶', '🚴', '🚗', '🚀'], // delivery speed
		service: ['😐', '😕', '🙂', '😊', '🤗'] // customer service
	};

	const labels: Record<RatingType, string[]> = {
		overall: ['Terrible', 'Poor', 'Average', 'Good', 'Excellent'],
		quality: ['Awful', 'Below Avg', 'Tasty', 'Delicious', 'Perfect'],
		delivery: ['Very Slow', 'Slow', 'Okay', 'Fast', 'Super Fast'],
		service: ['Rude', 'Unhelpful', 'Okay', 'Friendly', 'Amazing']
	};

	const emojis = $derived(emojiSets[type] || emojiSets.overall);
	const emojiLabels = $derived(labels[type] || labels.overall);
</script>

<div class="flex justify-center gap-3 text-3xl">
	{#each emojis as emoji, index}
		<div class="flex flex-col items-center gap-1">
			<button
				type="button"
				onclick={() => onChange(index + 1)}
				class="rounded-lg p-2 transition-all duration-200 {value === index + 1
					? 'scale-95 bg-green-100 shadow-inner ring-2 ring-green-500 ring-inset'
					: 'hover:bg-gray-100 active:scale-95'}"
			>
				{emoji}
			</button>
			<span
				class="text-xs transition-colors {value === index + 1
					? 'font-medium text-green-600'
					: 'text-gray-500'}"
			>
				{emojiLabels[index]}
			</span>
		</div>
	{/each}
</div>
