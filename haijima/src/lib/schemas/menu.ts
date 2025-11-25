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
	variantId?: string; // Optional (some items have no variants)
	name: string;
	price: number; // Unit price
	image: ImageVariants | null;
	quantity: number;
	// Helper for UI display (optional but useful)
	variantName?: string;
}

// For reordering, we just define the input shape we expect from the Order History API
export interface OrderHistoryItem {
	product_id: string;
	variant_id?: string | null;
	product_name: string;
	quantity: number;
	price: number; // This is usually TOTAL price in order history tables
	image_url: ImageVariants | null;
	variant_size?: string | null;
}
