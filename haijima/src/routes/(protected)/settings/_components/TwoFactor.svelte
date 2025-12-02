<script lang="ts">
	import { settingsStore } from '$lib/stores/settings.svelte';
	import Icon from '@iconify/svelte';
	import { slide } from 'svelte/transition';
	import QRcode from './QRcode.svelte';
	import RecoveryCodes from './RecoveryCodes.svelte';

	// No props needed, we read directly from the store
</script>

<div class="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
	<div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
		<div class="flex gap-4">
			<div class="rounded-full bg-blue-100 p-3 h-fit text-blue-600">
				<Icon icon="lucide:shield-check" width="24" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h2 class="text-lg font-semibold text-gray-900">Two-Factor Authentication</h2>
					{#if settingsStore.twoFactorEnabled}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
						>
							<Icon icon="lucide:check" width="12" /> Enabled
						</span>
					{/if}
				</div>
				<p class="mt-1 text-sm text-gray-600 max-w-md">
					Add an extra layer of security to your account using an authenticator app like Google
					Authenticator or Authy.
				</p>
			</div>
		</div>

		<button
			onclick={() => settingsStore.toggleTwoFactor(settingsStore.twoFactorEnabled)}
			disabled={settingsStore.loading}
			role="switch"
			aria-checked={settingsStore.twoFactorEnabled}
			aria-label={settingsStore.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
			class="
                relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2
                {settingsStore.twoFactorEnabled ? 'bg-green-600' : 'bg-gray-300'}
                {settingsStore.loading ? 'cursor-not-allowed opacity-50' : ''}
            "
		>
			<span
				aria-hidden="true"
				class="
                    pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    {settingsStore.twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'}
                "
			>
				{#if settingsStore.loading}
					<span class="absolute inset-0 flex items-center justify-center">
						<Icon icon="lucide:loader-2" class="h-4 w-4 animate-spin text-gray-400" />
					</span>
				{/if}
			</span>
		</button>
	</div>

	{#if settingsStore.showQRCode}
		<div transition:slide class="border-t border-gray-100 bg-gray-50/50">
			<QRcode />
		</div>
	{/if}

	{#if settingsStore.showRecoveryCodes}
		<div transition:slide class="border-t border-gray-100 bg-yellow-50/30">
			<RecoveryCodes />
		</div>
	{/if}

	{#if settingsStore.twoFactorEnabled}
		<div
			class="border-t border-gray-100 bg-gray-50/30 p-4 sm:px-6 flex items-center justify-between"
		>
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<Icon icon="lucide:key" class="text-gray-400" />
				<span>Recovery Codes</span>
			</div>
			<button
				onclick={() => settingsStore.regenerateRecoveryCodes()}
				disabled={settingsStore.loading}
				class="text-sm font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
			>
				Regenerate
			</button>
		</div>
	{/if}
</div>
