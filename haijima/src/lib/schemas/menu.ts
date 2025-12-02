export interface Category {
	id: string;
	name: string;
	icon_url: string | null;
}

export interface ImageVariants {
	id: string;
	lqip: string;
	variants: {
		avif: Record<number, string>;
		jpg: Record<number, string>;
	};
}

export interface ProductVariant {
	id: string;
	size_name: string;
	price: number;
	is_available: boolean;
}

export interface MenuItem {
	id: string;
	name: string;
	price: number;
	image: ImageVariants | null;
	available: boolean;
	category_id: string | null;
	variants?: ProductVariant[];
}

// --- CART TYPES ---

export interface CartItem {
	cartItemId: string; // Unique composite key (productId + variantId)
	productId: string;
	variantId?: string;
	name: string;
	price: number; // Unit price
	image: ImageVariants | null;
	quantity: number;
	variantName?: string;
}

export interface OrderHistoryProduct {
	id: string;
	product_id: string;
	variant_id: string | null;
	product_name: string;
	quantity: number;
	price: number;
	image_url: ImageVariants | null;
	variant_size: string | null;
}

export interface OrderHistoryItem {
	id: string;
	delivery_type: 'pickup' | 'delivery';

	// Address Details
	delivery_address_main_text: string | null;
	delivery_address_secondary_text: string | null;
	delivery_instructions: string | null;

	status: string;
	payment_status: string;
	payment_reference: string | null;
	mpesa_phone: string | null;

	subtotal: number;
	delivery_fee: number;
	total_amount: number;

	created_at: string;
	items: OrderHistoryProduct[];
}
