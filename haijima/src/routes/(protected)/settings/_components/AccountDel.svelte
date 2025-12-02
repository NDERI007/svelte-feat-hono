<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import Icon from '@iconify/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
</script>

<div class="rounded-xl bg-white border border-red-100 shadow-sm overflow-hidden mt-8">
	<div class="p-6 flex flex-col sm:flex-row gap-6 items-start">
		<div class="rounded-full bg-red-50 p-3 text-red-600">
			<Icon icon="lucide:alert-triangle" width="24" />
		</div>

		<div class="flex-1">
			<h2 class="text-lg font-semibold text-gray-900">Delete Account</h2>
			<p class="mt-1 text-sm text-gray-600 max-w-xl">
				Permanently remove your Personal Account and all of its contents from the platform. This
				action is not reversible, so please continue with caution.
			</p>

			<button
				onclick={() => (settingsStore.showDeleteConfirm = true)}
				class="mt-4 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
			>
				Delete Account
			</button>
		</div>
	</div>
</div>

<ConfirmModal
	bind:show={settingsStore.showDeleteConfirm}
	title="Delete Account"
	message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed."
	confirmText="Delete Account"
	cancelText="Cancel"
	loading={settingsStore.loading}
	onConfirm={() => settingsStore.deleteAccount()}
/>
