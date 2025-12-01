<script lang="ts">
	import Icon from '@iconify/svelte';

	let { orderData } = $props();

	const SUPPORT_WHATSAPP = '254745340424'; // Replace with your support number

	function handleContactSupport() {
		// Format order items
		const itemsList = orderData.items
			? orderData.items.map((item: any) => `• ${item.quantity}x ${item.product_name}`).join('\n')
			: 'No items listed';

		// Create support message using template literal
		const message = `🆘 *DELIVERY ISSUE*

📦 *Order Reference:* ${orderData.payment_reference}

👤 *Customer Phone:* ${orderData.mpesa_phone}

📍 *Delivery Address:*
${orderData.delivery_address_main_text}
${orderData.delivery_address_secondary_text || ''}

💰 *Total Amount:* KES ${orderData.total_amount.toFixed(2)}

📋 *Order Items:*
${itemsList}

⏰ *Order Time:* ${new Date(orderData.created_at).toLocaleString('en-KE')}

📌 *Issue:* I have not received my delivery yet. Please help.`;

		// Create WhatsApp URL
		const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;

		// Open WhatsApp
		window.open(whatsappUrl, '_blank');
	}
</script>

<div class="mb-6 overflow-hidden rounded-xl border-2 border-orange-200 bg-orange-50 shadow-sm">
	<div class="border-b border-orange-200 bg-orange-100 p-4">
		<div class="flex items-center gap-2">
			<Icon icon="lucide:alert-circle" class="h-5 w-5 text-orange-600" />
			<h3 class="font-semibold text-orange-900">Haven't received your delivery?</h3>
		</div>
	</div>

	<div class="p-4">
		<p class="mb-4 text-sm text-orange-800">
			If you haven't received your order or experiencing any issues, contact our support team on
			WhatsApp. We'll assist you immediately.
		</p>

		<button
			onclick={handleContactSupport}
			class="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700 active:bg-green-800"
		>
			<Icon icon="lucide:message-circle" class="h-5 w-5" />
			Contact Support on WhatsApp
		</button>

		<p class="mt-3 text-center text-xs text-orange-700">
			Your order details will be automatically included
		</p>
	</div>
</div>
