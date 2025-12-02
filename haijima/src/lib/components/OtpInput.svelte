<script lang="ts">
	let { value = $bindable(''), length = 6, disabled = false } = $props();

	let inputs: HTMLInputElement[] = [];

	let digits = $state<string[]>([]);

	$effect(() => {
		if (digits.length !== length) {
			// Reset/Resize if length changes
			digits = Array(length).fill('');
		}

		// Sync if parent clears the value externally
		if (value === '' && digits.some((d) => d !== '')) {
			digits = Array(length).fill('');
		}
	});

	function handleInput(e: Event, index: number) {
		const input = e.target as HTMLInputElement;
		const val = input.value;

		// 1. Handle Non-Numeric
		if (!/^\d*$/.test(val)) {
			input.value = digits[index];
			return;
		}

		// 2. Update State
		const lastChar = val.substring(val.length - 1);
		digits[index] = lastChar;

		// 3. Sync to Parent
		value = digits.join('');

		// 4. Auto-Focus Next
		if (lastChar && index < length - 1) {
			inputs[index + 1]?.focus();
		}
	}

	function handleKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Backspace') {
			if (!digits[index] && index > 0) {
				inputs[index - 1]?.focus();
				digits[index - 1] = '';
				value = digits.join('');
			} else {
				digits[index] = '';
				value = digits.join('');
			}
		} else if (e.key === 'ArrowLeft' && index > 0) {
			inputs[index - 1]?.focus();
		} else if (e.key === 'ArrowRight' && index < length - 1) {
			inputs[index + 1]?.focus();
		}
	}

	function handlePaste(e: ClipboardEvent) {
		e.preventDefault();
		const pasteData = e.clipboardData?.getData('text') || '';
		const numbers = pasteData.replace(/\D/g, '').slice(0, length).split('');

		if (numbers.length > 0) {
			// Update local digits
			numbers.forEach((num, i) => {
				if (i < length) digits[i] = num;
			});

			// Sync parent
			value = digits.join('');

			// Focus appropriate box
			const nextFocus = Math.min(numbers.length, length - 1);
			inputs[nextFocus]?.focus();
		}
	}
</script>

<div class="flex gap-2 sm:gap-3">
	{#each digits as digit, i}
		<input
			bind:this={inputs[i]}
			type="text"
			inputmode="numeric"
			maxlength="1"
			value={digit}
			aria-label={`Verification Digit ${i + 1}`}
			oninput={(e) => handleInput(e, i)}
			onkeydown={(e) => handleKeyDown(e, i)}
			onpaste={handlePaste}
			{disabled}
			class="h-10 w-10 sm:h-12 sm:w-12 rounded-lg border border-gray-300 bg-white text-center text-xl font-bold text-gray-900 shadow-sm transition-all
            focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none focus:-translate-y-0.5
            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
		/>
	{/each}
</div>
