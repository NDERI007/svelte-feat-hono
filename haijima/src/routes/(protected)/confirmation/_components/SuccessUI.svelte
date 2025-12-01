<script lang="ts">
	import { goto } from '$app/navigation';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import ConfirmCard from './confirmCard.svelte';
	import DeliveryBadge from './DeliveryBadge.svelte';
	import DeliveryCard from './deliveryCard.svelte';
	import OrderCard from './orderCard.svelte';
	import OrderItem from './OrderItem.svelte';
	import OrderStatus from './orderStatus.svelte';
	import SuccessHeader from './successHeader.svelte';
	import WhatsApp from './whatsapp.svelte';

	let { orderData } = $props();

	// Local UI state (Modals, Loading buttons)
	let showConfirmModal = $state(false);
	let confirmingDelivery = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleConfirmDelivery() {
		confirmingDelivery = true;
		errorMessage = null;
		try {
			const res = await fetch(`/api/orders/${orderData.id}/confirm-delivery`, {
				method: 'POST'
			});

			if (!res.ok) throw new Error('Failed to confirm');

			const data = await res.json();

			// Update local data immediately to reflect UI change
			orderData.status = 'delivered';
			orderData.delivered_at = data.order.delivered_at; // Sync with server response

			showConfirmModal = false;
		} catch (e) {
			errorMessage = 'Unable to confirm delivery. Please try again.';
		} finally {
			confirmingDelivery = false;
		}
	}
</script>

<div class="min-h-screen px-4 py-12" style="background-color: #fefaef">
	<div class="mx-auto max-w-3xl">
		<SuccessHeader orderId={orderData.id} createdAt={orderData.created_at} />

		{#if orderData.status === 'confirmed'}
			<div class="space-y-2">
				<ConfirmCard
					deliveryType={orderData.delivery_type}
					{confirmingDelivery}
					onConfirm={() => (showConfirmModal = true)}
				/>
				{#if errorMessage}
					<p class="text-sm text-red-600 text-center">{errorMessage}</p>
				{/if}
			</div>
		{/if}

		{#if orderData.status === 'delivered'}
			<DeliveryBadge deliveryType={orderData.delivery_type} />
		{/if}

		{#if orderData.status !== 'delivered'}
			<OrderStatus
				status={orderData.status}
				deliveryType={orderData.delivery_type}
				createdAt={orderData.created_at}
			/>
		{/if}

		<OrderCard
			email={orderData.user_email}
			mpesaPhone={orderData.mpesa_phone}
			paymentReference={orderData.payment_reference}
		/>

		<OrderItem
			items={orderData.items}
			subtotal={orderData.subtotal}
			deliveryFee={orderData.delivery_fee}
			totalAmount={orderData.total_amount}
			deliveryType={orderData.delivery_type}
		/>

		<DeliveryCard
			deliveryType={orderData.delivery_type}
			mainText={orderData.delivery_address_main_text}
			secondaryText={orderData.delivery_address_secondary_text}
			instructions={orderData.delivery_instructions}
		/>

		{#if orderData.status === 'confirmed'}
			<WhatsApp {orderData} />
		{/if}

		<div class="flex gap-4">
			<button
				onclick={() => goto('/orders')}
				class="flex-1 rounded-xl bg-green-900 py-4 font-semibold text-white transition-colors hover:bg-green-800"
			>
				View All Orders
			</button>
		</div>

		<ConfirmModal
			bind:show={showConfirmModal}
			title={orderData.delivery_type === 'pickup' ? 'Confirm Pickup' : 'Confirm Delivery'}
			message={orderData.delivery_type === 'pickup'
				? 'Have you picked up your order?'
				: 'Have you received your order?'}
			onConfirm={handleConfirmDelivery}
			loading={confirmingDelivery}
		/>
	</div>
</div>
