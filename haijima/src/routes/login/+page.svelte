<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from './$types';

	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let loading = $state(false);

	// 'step' is now mutable state, defaulting to 'email'
	let step = $state<'email' | 'verify'>('email');

	//Sync with server, but allow manual overrides
	$effect(() => {
		if (form?.step) {
			step = form.step as 'email' | 'verify';
		}
	});

	function goBack() {
		step = 'email';
		//Clear errors when going back so the UI looks clean
		if (form) form.error = undefined;
	}

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-lg ring-1 ring-gray-900/5">
		<div class="text-center">
			<h2 class="text-2xl font-bold tracking-tight text-gray-900">
				{step === 'email' ? 'Sign in to your account' : 'Verify your identity'}
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				{step === 'email'
					? 'Enter your email to receive a code'
					: `We sent a code to ${form?.email}`}
			</p>
		</div>

		{#if form?.error}
			<div class="rounded-md bg-red-50 p-4 border border-red-200">
				<div class="flex">
					<div class="text-sm text-red-700">{form.error}</div>
				</div>
			</div>
		{/if}

		{#if step === 'email'}
			<form method="POST" action="?/send" use:enhance={handleSubmit} class="mt-8 space-y-6">
				<div>
					<label for="email" class="block text-sm font-medium leading-6 text-gray-900"
						>Email address</label
					>
					<div class="mt-2">
						<input
							id="email"
							name="email"
							type="email"
							value={form?.email ?? ''}
							autocomplete="email"
							required
							placeholder="you@example.com"
							class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Sending Code...' : 'Send OTP'}
				</button>
			</form>
		{:else}
			<form method="POST" action="?/verify" use:enhance={handleSubmit} class="mt-8 space-y-6">
				<input type="hidden" name="email" value={form?.email} />
				<input type="hidden" name="redirectTo" value={page.url.searchParams.get('redirectTo')} />

				<div>
					<label for="code" class="block text-sm font-medium leading-6 text-gray-900"
						>One-Time Password</label
					>
					<div class="mt-2">
						<input
							id="code"
							name="code"
							type="text"
							pattern="[0-9]*"
							inputmode="numeric"
							autocomplete="one-time-code"
							required
							placeholder="123456"
							maxlength="6"
							class="block w-full rounded-md border-0 py-1.5 text-center text-2xl font-mono tracking-[0.5em] text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={loading}
					class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Verifying...' : 'Verify & Login'}
				</button>

				<div class="text-center text-sm">
					<button
						type="button"
						onclick={goBack}
						class="font-semibold text-indigo-600 hover:text-indigo-500 hover:underline bg-transparent border-0 cursor-pointer"
					>
						Entered wrong email?
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
