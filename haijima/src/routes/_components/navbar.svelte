<script lang="ts">
</script>

<nav
	class="sticky top-0 left-0 z-30 w-full border-b backdrop-blur-sm"
	style="background-color: rgba(255, 255, 255, 0.95); border-color: var(--color-border);"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
		<a
			href="/"
			data-sveltekit-preload-data="hover"
			class="text-2xl font-bold transition-all hover:opacity-90"
			style="color: var(--color-text);"
		>
			Weddy's Kitchen
		</a>

		<a
			href="/login"
			data-sveltekit-preload-data="hover"
			class="rounded-lg px-5 py-2.5 text-base font-semibold transition-all duration-200 hover:shadow-md"
			style="color: white; background-color: var(--color-theme-1);"
			onmouseenter={(e) => {
				e.currentTarget.style.backgroundColor = 'var(--color-theme-2)';
				e.currentTarget.style.transform = 'translateY(-1px)';
			}}
			onmouseleave={(e) => {
				e.currentTarget.style.backgroundColor = 'var(--color-theme-1)';
				e.currentTarget.style.transform = 'translateY(0)';
			}}
		>
			Login
		</a>
	</div>
</nav>
