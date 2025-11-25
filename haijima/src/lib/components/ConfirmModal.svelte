<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	let {
		show,
		message,
		onConfirm,
		onCancel,
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		loading = false
	} = $props<{
		show: boolean;
		message: string;
		onConfirm: () => void;
		onCancel: () => void;
		confirmText?: string;
		cancelText?: string;
		loading?: boolean;
	}>();
</script>

{#if show}
	<!-- 
        BACKDROP
        - Changed to a <div> to fix the nesting error.
        - Added role="button" and tabindex="0" so it's still accessible/clickable.
    -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm outline-none"
		transition:fade={{ duration: 200 }}
		onclick={onCancel}
		onkeydown={(e) => e.key === 'Escape' && onCancel()}
		role="button"
		tabindex="0"
	>
		<!-- 
            MODAL BOX
            - e.stopPropagation() prevents clicks inside the box from triggering the backdrop's onCancel.
        -->
		<div
			role="dialog"
			aria-modal="true"
			class="w-full max-w-sm rounded-xl bg-[#FEFAEF] p-5 shadow-xl ring-1 ring-green-900/30 cursor-default"
			transition:scale={{ start: 0.9, duration: 300, easing: quintOut, opacity: 0 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && onCancel()}
			tabindex="-1"
		>
			<p class="mb-4 text-base font-medium text-green-900">
				{message}
			</p>

			<div class="flex justify-end gap-3">
				<button
					onclick={onCancel}
					disabled={loading}
					class="rounded-md border border-green-900/40 bg-transparent px-4 py-2 text-sm font-medium text-green-900 transition-colors hover:bg-green-900/10 disabled:opacity-50"
				>
					{cancelText}
				</button>

				<button
					onclick={onConfirm}
					disabled={loading}
					class="rounded-md bg-green-900 px-4 py-2 text-sm font-medium text-[#FEFAEF] transition-colors hover:bg-green-800 disabled:opacity-50"
				>
					{loading ? 'Processing...' : confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
