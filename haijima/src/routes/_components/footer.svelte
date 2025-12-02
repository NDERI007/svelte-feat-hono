<script lang="ts">
	import { fade } from 'svelte/transition';

	type PageKey = 'terms' | 'privacy' | 'refund' | 'faq';

	interface LegalPage {
		title: string;
		content: string;
	}

	let activePage: PageKey | null = $state(null);

	const legalPages: Record<PageKey, LegalPage> = {
		terms: {
			title: 'Terms of Service',
			content: `
Last Updated: 24-Nov-25

Welcome to Weddy's Kitchen. By using our food ordering service, you agree to these Terms of Service.

## 1. Service Description
Weddy's Kitchen is a food ordering and delivery service operating within a 5km radius from Kirinyaga University. We prepare fresh meals and deliver them to your specified location.

## 2. Account Registration
- You must provide accurate information during signup
- You are responsible for maintaining the confidentiality of your account
- You must be at least 18 years old to place orders
- One account per person

## 3. Orders and Payment
- All orders are subject to acceptance and availability
- Prices are displayed in KES and may change without notice
- We accept M-Pesa and Cash on Delivery
- Payment must be completed before order preparation begins
- For M-Pesa payments, you authorize STK push notifications to your phone

## 4. Delivery
- Delivery is available within 5km of Campus
- Estimated delivery times are approximate and not guaranteed
- You must provide accurate delivery address and phone number
- Failed deliveries due to incorrect information may incur additional charges
- We are not liable for delays beyond our reasonable control

## 5. Order Cancellation
- Orders can be cancelled within 10 minutes of placement
- Once food preparation has started, orders cannot be cancelled
- Refunds for cancelled orders will be processed within 3-7 business days
- Please refer to our Refund Policy for more details

## 6. Food Safety and Quality
- All meals are prepared fresh daily
- We make reasonable efforts to accommodate dietary restrictions when specified
- Allergen information should be requested before ordering

## 7. User Conduct
You agree NOT to:
- Provide false delivery information
- Use the service for fraudulent purposes
- Abuse, harass, or mistreat delivery personnel
- Share your account credentials with others

## 8. Liability
- Weddy's Kitchen is not liable for any allergic reactions unless we were informed in advance
- We are not responsible for items left unattended after delivery
- Our liability is limited to the value of your order
- We are not liable for delays caused by weather, traffic, or other unforeseen circumstances

## 9. Privacy
Your use of Weddy's Kitchen is also governed by our Privacy Policy. We collect and store your email address and order information.

## 10. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.

## 11. Contact
For questions about these Terms, contact us at 0745340424/0727942764.

## 12. Governing Law
These Terms are governed by the laws of Kenya.
      `
		},
		privacy: {
			title: 'Privacy Policy',
			content: `
Last Updated: [DATE]

Weddy's Kitchen ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your personal information.

## 1. Information We Collect

### Information You Provide:
- **Email Address**: Collected during account signup
- **Phone Number**: May be collected when you make M-Pesa payments for order confirmation
- **Delivery Address**: Provided when placing orders
- **Order History**: Records of your food orders and preferences

### Automatically Collected Information:
- Device information and browser type
- IP address
- Cookies and similar technologies (if applicable)

## 2. How We Use Your Information

We use your information to:
- Process and fulfill your food orders
- Send STK push notifications for M-Pesa payments
- Communicate order status and delivery updates
- Provide customer support
- Improve our service and menu offerings
- Send promotional offers (with your consent)

## 3. Information Sharing

We DO NOT sell your personal information. We may share your information with:
- **Payment Processors**: M-Pesa/Safaricom for payment processing
- **Delivery Personnel**: Only name, phone, and delivery address for order fulfillment
- **Legal Requirements**: When required by law or to protect our rights

## 4. Data Storage and Security

- Your data is stored securely on our servers
- We implement reasonable security measures to protect your information
- However, no internet transmission is 100% secure
- We retain your data for as long as your account is active or as needed to provide services

## 5. Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your account and data
- Opt-out of promotional communications
- Withdraw consent for data processing

To exercise these rights, contact us at 0745340424/0727942764.

## 6. Cookies

[IF APPLICABLE] We may use cookies to enhance your experience. You can disable cookies in your browser settings, but this may affect functionality.

## 7. Third-Party Services

We use M-Pesa for payment processing. Their privacy policies apply to information they collect. We are not responsible for third-party privacy practices.

## 8. Children's Privacy

Our service is not intended for individuals under 18. We do not knowingly collect information from minors.

## 9. Changes to This Policy

We may update this Privacy Policy periodically. Continued use of our service after changes constitutes acceptance.

## 10. Contact Us

For privacy concerns or questions, contact us at:
- Phone: 0745340424/0727942764
- Email: eaterpumpkin062@gmail.com
      `
		},
		refund: {
			title: 'Refund Policy',
			content: `
Last Updated: 17-Oct-2025

At Weddy's Kitchen, we strive for customer satisfaction. This Refund Policy outlines when and how refunds are issued.

## 1. Eligibility for Refunds

You may be eligible for a refund if:
- Your order was not delivered
- The delivered food was significantly different from what was ordered
- The food arrived in unacceptable condition (spoiled, contaminated, or unsafe)
- You were charged incorrectly

## 2. Non-Refundable Situations

Refunds will NOT be issued if:
- You changed your mind after food preparation started
- You provided an incorrect delivery address
- You were unavailable to receive the delivery after multiple attempts
- You simply didn't like the taste (subjective preference)
- The order was delivered as described

## 3. How to Request a Refund

To request a refund:
1. Contact us at 0745340424/0727942764 within [24 hours] of delivery
2. Provide your order number and reason for refund
3. Provide photo evidence if claiming food quality issues
4. We will review your request within [24-48] hours

## 4. Refund Process

### For M-Pesa Payments:
- Approved refunds will be processed back to your M-Pesa number
- M-Pesa transaction charges are non-refundable

## 5. Partial Refunds

In some cases, we may offer:
- Partial refunds for missing items and if your order was cancelled within 15 minutes of placement
- Replacement meals at no additional cost

## 6. Order Cancellations

- **Before Preparation**: Full refund
- **During Preparation**: Orders cancelled after 15 minutes may qualify for a partial refund, since preparation costs may have already been incurred.
- **After Delivery**: Refer to refund eligibility criteria above

## 7. Delivery Issues

If your order doesn't arrive:
- Contact us immediately at 0745340424/0727942764
- We will attempt redelivery or issue a full refund
- If you provided wrong address information, refunds may not apply

## 8. Quality Complaints

For food quality issues:
- Take clear photos before consuming any of the food
- Contact us within [2 hours] of delivery
- We may request you return the food for inspection
- Approved claims receive full refund or replacement

## 9. Processing Time

- Refund requests are reviewed within [24-48] hours
- Approved refunds are processed within 1 business days
- You will receive confirmation via whatsapp/email when refund is processed

## 10. Disputes

If you disagree with our refund decision:
- Provide additional evidence for reconsideration
- Final decisions are at Weddy's Kitchen' discretion

## 11. Contact

For refund requests or questions:
- Phone: 0745340424/0727942764
- Email: eaterpumpkin062@gmail.com
- Include order number in all communications

## 12. Policy Changes

We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately upon posting.
      `
		},
		faq: {
			title: 'Frequently Asked Questions',
			content: `
## Ordering

**How do I place an order?**
Browse our menu, select your items, add them to cart, and proceed to checkout. You'll need to create an account if you haven't already.

**What are your operating hours?**
From 9:00AM to 9:30PM

**Can I customize my order?**
Yes! You can specify dietary preferences and modifications in the special instructions section during checkout.

---

## Delivery

**Where do you deliver?**
We deliver within a 5km radius from Kirinyaga University.

**How long does delivery take?**
Typical delivery time is [10-20] minutes, depending on your location and order complexity.

**What if I'm not available when the delivery arrives?**
Please ensure you're available during the estimated delivery window. Select the pickup option or contact us immediately at 0745340424/0727942764 if you need to reschedule.

**Do you deliver to hostels/dorms?**
Yes, we do! We deliver to hostels and dorms, but please note that our riders only deliver to the main entrance.
Just meet your rider at the entrance to pick up your order — it keeps things quick and hassle-free for everyone!

---

## Payment

**What payment methods do you accept?**
We accept only M-Pesa

**Is there a delivery fee?**
Yes, it's 10 bob

**How does M-Pesa payment work?**
After placing your order, you'll receive an STK push notification on your phone. Enter your M-Pesa PIN to complete the payment.

**What if the M-Pesa payment fails?**
You can retry the payment or Contact us at 0745340424/0727942764 if you continue experiencing issues.

---

## Order Changes & Cancellations

**Can I modify my order after placing it?**
Contact us immediately at 0745340424/0727942764. If food preparation hasn't started, we can make changes.

**Do I get a refund if I cancel?**
Yes, if cancelled before preparation starts. See our Refund Policy for details.

---

## Food & Dietary

**Do you accommodate dietary restrictions?**
We do our best to accommodate allergies and dietary preferences. Please specify in your order notes.

**Are your ingredients fresh?**
Yes! All meals are prepared fresh daily with quality ingredients.

**What if I have a food allergy?**
Please inform us of any allergies in your order notes. Contact us at 0745340424/0727942764 if you have severe allergies.

---

## Account & Technical

**How do I create an account?**
Tap "Sign Up" and enter your email address. We'll send you a one-time verification code (OTP) to confirm it — no password needed!
Once verified, your account is created instantly, and you can log in the same way anytime.

**The app/website isn't working. What should I do?**
Try refreshing the page or clearing your browser cache. If issues persist, contact us at 0745340424/0727942764.

---

## Problems & Support

**My order is late. What should I do?**
Contact us at 0745340424/0727942764 for real-time order status.

**My order is wrong or missing items. What do I do?**
Call us immediately at 0745340424/0727942764. Take photos of what you received and we'll resolve it promptly.

**The food quality isn't good. Can I get a refund?**
Yes, contact us within 2 hours at 0745340424/0727942764 with photos. See our Refund Policy for details.

**How do I provide feedback?**
We'd love to hear from you!
Just tap the Feedback button floating on your screen to share your thoughts, or reach us directly at 0723 414 134 or tnderi373@gmail.com.

---

## Contact

**How can I reach customer support?**
Call or WhatsApp us at 0745340424/0727942764

**What are your support hours?**
9:00AM to 9:30PM

---

Still have questions? Contact us at 0745340424 or 0727942764
      `
		}
	};

	function openPage(pageKey: PageKey) {
		activePage = pageKey;
	}

	function closePage() {
		activePage = null;
	}

	function formatContent(content: string) {
		return content.split('\n').map((line, idx) => {
			const trimmed = line.trim();

			if (trimmed.startsWith('## ')) {
				return { type: 'h2', content: trimmed.slice(3), key: idx };
			} else if (trimmed.startsWith('### ')) {
				return { type: 'h3', content: trimmed.slice(4), key: idx };
			} else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
				return { type: 'bold', content: trimmed.slice(2, -2), key: idx };
			} else if (trimmed.startsWith('- ')) {
				return { type: 'li', content: trimmed.slice(2), key: idx };
			} else if (trimmed === '') {
				return { type: 'br', content: '', key: idx };
			} else if (trimmed.startsWith('---')) {
				return { type: 'hr', content: '', key: idx };
			} else {
				return { type: 'p', content: line, key: idx };
			}
		});
	}
</script>

<footer class="mt-auto" style="background-color: var(--color-text);">
	<div class="mx-auto max-w-6xl px-6 py-12">
		<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
			<!-- Brand Column -->
			<div>
				<h3 class="mb-4 text-lg font-bold" style="color: var(--color-theme-1);">Weddy's Kitchen</h3>
				<div class="text-sm" style="color: rgba(255, 255, 255, 0.8);">
					<p class="mb-2 leading-relaxed" style="color: rgba(255, 255, 255, 0.6);">
						<span class="text-white">Delivery Area:</span>
						<br />
						5km radius from School Campus
					</p>
				</div>
			</div>

			<!-- Legal Column -->
			<div>
				<h3 class="mb-4 text-lg font-bold text-white">Legal</h3>
				<ul class="space-y-3 text-sm" style="color: rgba(255, 255, 255, 0.8);">
					<li>
						<button
							onclick={() => openPage('terms')}
							class="transition-colors hover:text-white relative group"
							type="button"
						>
							Terms of Service
						</button>
					</li>
					<li>
						<button
							onclick={() => openPage('privacy')}
							class="transition-colors hover:text-white relative group"
							type="button"
						>
							Privacy Policy
						</button>
					</li>
					<li>
						<button
							onclick={() => openPage('refund')}
							class="transition-colors hover:text-white relative group"
							type="button"
						>
							Refund Policy
						</button>
					</li>
				</ul>
			</div>

			<!-- Help Column -->
			<div>
				<h3 class="mb-4 text-lg font-bold text-white">Help</h3>
				<ul class="space-y-3 text-sm" style="color: rgba(255, 255, 255, 0.8);">
					<li>
						<button
							onclick={() => openPage('faq')}
							class="transition-colors hover:text-white relative group"
							type="button"
						>
							FAQ
						</button>
					</li>
					<li class="pt-2">
						<span class="text-white">Contact Us:</span>
						<br />
						<a
							href="tel:0745340424"
							class="transition-colors hover:text-white inline-block mt-1"
							style="color: var(--color-theme-1);"
						>
							0745340424 / 0727942764
						</a>
					</li>
				</ul>
			</div>
		</div>

		<!-- Footer Bottom -->
		<div
			class="mt-10 border-t pt-8 text-center text-sm"
			style="border-color: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.5);"
		>
			<p>&copy; {new Date().getFullYear()} Weddy's Kitchen. All rights reserved.</p>
		</div>
	</div>
</footer>

<!-- Modal -->
{#if activePage}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 200 }}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<button
			class="absolute inset-0 w-full h-full cursor-default"
			onclick={closePage}
			aria-label="Close modal"
			tabindex="-1"
			type="button"
		></button>

		<div
			class="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl relative z-10 shadow-2xl"
			style="background-color: var(--color-bg-0); border: 1px solid var(--color-border);"
			role="document"
		>
			<!-- Modal Header -->
			<div
				class="flex items-center justify-between border-b p-6"
				style="border-color: var(--color-border); background-color: var(--color-bg-0);"
			>
				<h2 id="modal-title" class="text-2xl font-bold" style="color: var(--color-theme-1);">
					{legalPages[activePage]?.title || 'Info'}
				</h2>
				<button
					onclick={closePage}
					class="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none transition-all hover:bg-[var(--color-bg-2)] focus:outline-none"
					style="color: var(--color-text-muted);"
					type="button"
					aria-label="Close modal"
				>
					×
				</button>
			</div>

			<!-- Modal Content -->
			<div class="overflow-y-auto p-6" style="background-color: var(--color-bg-1);">
				<div class="prose prose-sm max-w-none">
					{#if legalPages[activePage]}
						{#each formatContent(legalPages[activePage].content) as line (line.key)}
							{#if line.type === 'h2'}
								<h2 class="mt-6 mb-3 text-xl font-bold" style="color: var(--color-text);">
									{line.content}
								</h2>
							{:else if line.type === 'h3'}
								<h3 class="mt-4 mb-2 text-lg font-semibold" style="color: var(--color-theme-1);">
									{line.content}
								</h3>
							{:else if line.type === 'bold'}
								<p class="mt-3 mb-1 font-semibold" style="color: var(--color-text);">
									{line.content}
								</p>
							{:else if line.type === 'li'}
								<li class="ml-4" style="color: var(--color-text-muted);">{line.content}</li>
							{:else if line.type === 'br'}
								<br />
							{:else if line.type === 'hr'}
								<hr class="my-6" style="border-color: var(--color-border);" />
							{:else}
								<p class="mb-2" style="color: var(--color-text-muted);">{line.content}</p>
							{/if}
						{/each}
					{/if}
				</div>
			</div>

			<!-- Modal Footer -->
			<div
				class="flex justify-end border-t p-4"
				style="border-color: var(--color-border); background-color: var(--color-bg-0);"
			>
				<button
					onclick={closePage}
					class="rounded-lg px-6 py-2.5 text-white font-semibold transition-all hover:shadow-lg"
					style="background-color: var(--color-theme-1);"
					onmouseenter={(e) => {
						e.currentTarget.style.backgroundColor = 'var(--color-theme-2)';
						e.currentTarget.style.transform = 'translateY(-1px)';
					}}
					onmouseleave={(e) => {
						e.currentTarget.style.backgroundColor = 'var(--color-theme-1)';
						e.currentTarget.style.transform = 'translateY(0)';
					}}
					type="button"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
