<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let {
		show = $bindable(),
		title,
		message,
		onConfirm,
		onCancel,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		loading = false
	} = $props<{
		show: boolean;
		title?: string;
		message: string;
		onConfirm: () => void;
		onCancel?: () => void;
		confirmText?: string;
		cancelText?: string;
		loading?: boolean;
	}>();

	function close() {
		if (loading) return;
		show = false;
		if (onCancel) onCancel();
	}

	// ✅ FIX: Handle backdrop click logic here instead of using stopPropagation on child
	function handleBackdropClick(event: MouseEvent) {
		// Only close if the user clicked the backdrop (currentTarget),
		// not if they clicked the inner modal content (target).
		if (event.target === event.currentTarget) {
			close();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm outline-none"
		transition:fade={{ duration: 200 }}
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="0"
		aria-label="Close modal"
	>
		<div
			role="dialog"
			aria-modal="true"
			class="w-full max-w-sm cursor-default rounded-xl bg-[#FEFAEF] p-6 shadow-xl ring-1 ring-green-900/30"
			transition:scale={{ start: 0.95, duration: 200, easing: quintOut }}
			tabindex="-1"
		>
			{#if title}
				<h3 class="mb-2 text-lg font-bold text-green-900">
					{title}
				</h3>
			{/if}

			<p class="mb-6 text-base text-gray-700">
				{message}
			</p>

			<div class="flex justify-end gap-3">
				<button
					onclick={close}
					disabled={loading}
					class="rounded-lg border border-green-900/20 bg-transparent px-4 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-900/5 disabled:opacity-50"
				>
					{cancelText}
				</button>

				<button
					onclick={onConfirm}
					disabled={loading}
					class="flex items-center gap-2 rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-[#FEFAEF] transition-colors hover:bg-green-800 disabled:opacity-50"
				>
					{#if loading}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
						></div>
						Processing...
					{:else}
						{confirmText}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
