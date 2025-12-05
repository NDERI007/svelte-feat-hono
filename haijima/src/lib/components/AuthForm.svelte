<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import type { SubmitFunction } from '@sveltejs/kit';
	import Icon from '@iconify/svelte';

	// 1. Define the specific Union Type
	type AuthMode = 'login' | 'signup';

	// 2. Define the Props Interface
	interface AuthFormProps {
		mode?: AuthMode; // Optional because it has a default value
		formData: any;
	}

	// 3. Pass the Interface to $props()
	// This tells TS that 'mode' is strictly 'login' | 'signup'
	let { mode = 'login', formData }: AuthFormProps = $props();

	let loading = $state(false);
	let step = $state<'email' | 'verify'>('email');

	// 4. Define Config with Record type to match AuthMode
	const CONFIG: Record<
		AuthMode,
		{
			title: string;
			subtitle: string;
			button: string;
			altLinkText: string;
			altLinkAction: string;
			altLinkHref: string;
		}
	> = {
		login: {
			title: 'Welcome back',
			subtitle: 'Sign in with your email to continue',
			button: 'Sign In with Email',
			altLinkText: "Don't have an account?",
			altLinkAction: 'Create one',
			altLinkHref: '/signup'
		},
		signup: {
			title: 'Create your account',
			subtitle: 'Enter your email to get started',
			button: 'Sign Up with Email',
			altLinkText: 'Already have an account?',
			altLinkAction: 'Sign in',
			altLinkHref: '/login'
		}
	};

	// Sync step with server response
	$effect(() => {
		if (formData?.step) {
			step = formData.step as 'email' | 'verify';
		}
	});

	function goBack() {
		step = 'email';
	}

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	};
</script>

<div
	class="flex min-h-screen items-center justify-center px-4 py-12 bg-[var(--color-bg-1)] transition-colors duration-200"
>
	<div class="w-full max-w-md space-y-8">
		<div
			class="relative overflow-hidden rounded-2xl bg-[var(--color-bg-0)] p-8 shadow-xl border border-[var(--color-border)]"
		>
			<div class="relative space-y-6">
				<div class="text-center">
					<h2 class="text-2xl font-bold tracking-tight text-[var(--color-text)]">
						{step === 'email' ? CONFIG[mode].title : 'Verify your identity'}
					</h2>
					<p class="mt-2 text-sm text-[var(--color-text-muted)]">
						{step === 'email'
							? CONFIG[mode].subtitle
							: `We sent a 6-digit code to ${formData?.email}`}
					</p>
				</div>

				{#if formData?.error}
					<div
						class="rounded-lg bg-[var(--color-theme-light)] p-4 border border-[var(--color-theme-1)]/20 flex gap-3"
					>
						<Icon
							icon="lucide:alert-circle"
							class="text-[var(--color-theme-2)] flex-shrink-0 mt-0.5"
						/>
						<p class="text-sm font-medium text-[var(--color-theme-2)]">{formData.error}</p>
					</div>
				{/if}

				{#if step === 'email'}
					<form method="POST" action="?/send" use:enhance={handleSubmit} class="space-y-5">
						<div>
							<label for="email" class="block text-sm font-medium text-[var(--color-text)] mb-1"
								>Email address</label
							>
							<input
								id="email"
								name="email"
								type="email"
								value={formData?.email ?? ''}
								required
								placeholder="you@example.com"
								class="block w-full rounded-lg border border-[var(--color-border)] bg-white px-4 py-2.5 text-[var(--color-text)] placeholder-[var(--color-text-lighter)] focus:border-[var(--color-theme-1)] focus:ring-1 focus:ring-[var(--color-theme-1)] outline-none transition-all"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="w-full rounded-lg bg-[var(--color-text-black)] py-2.5 text-white font-semibold hover:bg-[var(--color-text-dark)] disabled:opacity-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-[1px] flex items-center justify-center gap-2"
						>
							{#if loading}
								<Icon icon="lucide:loader-2" class="animate-spin" /> Sending...
							{:else}
								{CONFIG[mode].button}
							{/if}
						</button>

						<div class="text-center text-sm text-[var(--color-text-muted)]">
							{CONFIG[mode].altLinkText}
							<a
								href={CONFIG[mode].altLinkHref}
								class="font-medium text-[var(--color-theme-1)] hover:text-[var(--color-theme-2)] hover:underline"
							>
								{CONFIG[mode].altLinkAction}
							</a>
						</div>
					</form>
				{:else}
					<form method="POST" action="?/verify" use:enhance={handleSubmit} class="space-y-5">
						<input type="hidden" name="email" value={formData?.email} />
						<input
							type="hidden"
							name="redirectTo"
							value={page.url.searchParams.get('redirectTo')}
						/>

						<div>
							<label for="code" class="block text-sm font-medium text-[var(--color-text)] mb-1"
								>Verification Code</label
							>
							<input
								id="code"
								name="code"
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								maxlength="6"
								required
								placeholder="Enter verification code"
								class="block w-full rounded-lg border border-[var(--color-border)] bg-white py-3 text-center text-2xl font-mono tracking-widest text-[var(--color-text)] placeholder-[var(--color-border)] focus:border-[var(--color-theme-1)] focus:ring-1 focus:ring-[var(--color-theme-1)] outline-none transition-all"
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							class="w-full rounded-lg bg-[var(--color-text-black)] py-2.5 text-white font-semibold hover:bg-[var(--color-text-dark)] disabled:opacity-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-[1px]"
						>
							{loading ? 'Verifying...' : 'Verify Email address'}
						</button>

						<button
							type="button"
							onclick={goBack}
							class="w-full text-sm text-[var(--color-text-black)] hover:text-[var(--color-text-charcoal)]"
						>
							Use a different email
						</button>
					</form>
				{/if}
			</div>
		</div>
	</div>
</div>
