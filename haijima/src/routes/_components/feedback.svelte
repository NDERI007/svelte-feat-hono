<script lang="ts">
	import { fade } from 'svelte/transition';
	import EmojiRate from '$lib/components/emojiRate.svelte';

	interface SurveyData {
		overallRating: number;
		whatYouLiked: string;
		improvements: string;
		additionalComments: string;
	}

	let isOpen = $state(false);
	let submitted = $state(false);
	let isSubmitting = $state(false);
	let surveyData = $state<SurveyData>({
		overallRating: 0,
		whatYouLiked: '',
		improvements: '',
		additionalComments: ''
	});

	const API_BASE = 'http://localhost:8787';

	function handleRatingClick(rating: number) {
		surveyData.overallRating = rating;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();

		if (!surveyData.overallRating) {
			alert('Please rate your experience before submitting.');
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch(`${API_BASE}/api/v1/feedback/insert`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
					// Add auth token if needed:
					// 'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({
					overall_rating: surveyData.overallRating,
					what_you_liked: surveyData.whatYouLiked,
					improvements: surveyData.improvements,
					additional_comments: surveyData.additionalComments
				})
			});

			if (!response.ok) {
				throw new Error(`Server error: ${response.status}`);
			}

			const data = await response.json();

			if (data?.success) {
				submitted = true;

				setTimeout(() => {
					isOpen = false;
					submitted = false;
					surveyData = {
						overallRating: 0,
						whatYouLiked: '',
						improvements: '',
						additionalComments: ''
					};
				}, 2000);
			} else {
				alert(data?.message || 'Something went wrong. Try again.');
			}
		} catch (error) {
			console.error('Error submitting feedback:', error);
			alert('Failed to submit feedback. Please check your connection and try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function closeModal() {
		isOpen = false;
	}
</script>

<!-- Floating Feedback Button -->
<div class="group fixed right-6 bottom-6 z-50">
	<button
		onclick={() => (isOpen = true)}
		class="rounded-full bg-green-600 p-3 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
		aria-label="Open feedback form"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
		</svg>
	</button>
	<div
		class="absolute top-1/2 right-16 -translate-y-1/2 rounded-md bg-gray-800 px-3 py-1 text-sm whitespace-nowrap text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
	>
		Share your experience!
	</div>
</div>

<!-- Modal -->
{#if isOpen}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="feedback-modal-title"
		tabindex="-1"
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 w-full h-full cursor-default"
			onclick={closeModal}
			aria-label="Close modal"
			tabindex="-1"
			type="button"
		></button>

		<div
			class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl z-10"
			role="document"
		>
			<button
				onclick={closeModal}
				class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 text-2xl focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
				type="button"
				aria-label="Close feedback form"
			>
				✕
			</button>

			{#if !submitted}
				<h2 id="feedback-modal-title" class="mb-2 text-2xl font-semibold text-gray-800">
					How was your experience?
				</h2>
				<p class="mb-6 text-sm text-gray-600">
					We'd love to know how you feel about Weddy's Kitchen!
				</p>

				<form onsubmit={handleSubmit} class="space-y-6">
					<!-- Overall Experience Rating -->
					<div class="text-center">
						<div
							class="mb-3 text-sm font-medium text-gray-700"
							role="group"
							aria-label="Overall rating"
						>
							Overall, how would you rate Weddy's Kitchen?
							<span class="text-red-500">*</span>
						</div>
						<EmojiRate
							value={surveyData.overallRating}
							onChange={handleRatingClick}
							type="overall"
						/>
					</div>

					<!-- What You Liked -->
					<div>
						<label for="liked" class="mb-2 block text-sm font-medium text-gray-700">
							What did you like most? (Optional)
						</label>
						<textarea
							id="liked"
							bind:value={surveyData.whatYouLiked}
							placeholder="e.g., Fast delivery, great food quality, friendly staff..."
							class="h-24 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
						></textarea>
					</div>

					<!-- Improvements -->
					<div>
						<label for="improvements" class="mb-2 block text-sm font-medium text-gray-700">
							What could we improve? (Optional)
						</label>
						<textarea
							id="improvements"
							bind:value={surveyData.improvements}
							placeholder="e.g., Faster delivery, better app design, more menu options..."
							class="h-24 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
						></textarea>
					</div>

					<!-- Additional Comments -->
					<div>
						<label for="comments" class="mb-2 block text-sm font-medium text-gray-700">
							Anything else you'd like to share? (Optional)
						</label>
						<textarea
							id="comments"
							bind:value={surveyData.additionalComments}
							placeholder="Share any other thoughts or suggestions..."
							class="h-20 w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-600 focus:outline-none"
						></textarea>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || surveyData.overallRating === 0}
						class="w-full rounded-lg bg-green-600 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
					>
						{isSubmitting ? 'Submitting...' : 'Submit Feedback'}
					</button>
				</form>
			{:else}
				<div class="py-12 text-center">
					<div
						class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
					>
						<svg
							class="h-8 w-8 text-green-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
					<h3 class="mb-2 text-xl font-semibold text-gray-800">Thank you for your feedback!</h3>
					<p class="text-sm text-gray-600">
						Your thoughts help us make Weddy's Kitchen even better.
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
