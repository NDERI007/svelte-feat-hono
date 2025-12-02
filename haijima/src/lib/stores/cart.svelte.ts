import { browser } from '$app/environment';
import type { CartItem, MenuItem, ProductVariant, OrderHistoryProduct } from '$lib/schemas/menu';

class CartStore {
	// --- State (Runes) ---
	items = $state<CartItem[]>([]);
	isOpen = $state(false);
	userId = $state<string>('guest');

	constructor() {
		if (browser) {
			// 1. Recover User ID
			const storedUserId = localStorage.getItem('cart-user-id');
			if (storedUserId) {
				this.userId = storedUserId;
			}
			// 2. Load Cart Data
			this.loadFromStorage();
		}
	}

	// --- Persistence ---

	private getStorageKey() {
		return `cart-storage-${this.userId || 'guest'}`;
	}

	private loadFromStorage() {
		if (!browser) return;
		const key = this.getStorageKey();
		const stored = localStorage.getItem(key);

		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				// Zustand wraps in { state: ... }, we flatten it here
				this.items = parsed.items || parsed.state?.items || [];
			} catch (e) {
				console.error('Cart load error:', e);
				this.items = [];
			}
		} else {
			this.items = [];
		}
	}

	private saveToStorage() {
		if (!browser) return;
		const key = this.getStorageKey();
		const data = { items: this.items }; // We only persist items, not isOpen
		localStorage.setItem(key, JSON.stringify(data));
	}

	// --- Actions ---

	setUserId(newUserId: string | null) {
		const userId = newUserId || 'guest';
		if (this.userId !== userId) {
			this.userId = userId;
			if (browser) localStorage.setItem('cart-user-id', userId);

			// Switch "profiles" (Guest Cart vs User Cart)
			this.loadFromStorage();
		}
	}

	toggleCart() {
		this.isOpen = !this.isOpen;
	}

	openCart() {
		this.isOpen = true;
	}

	closeCart() {
		this.isOpen = false;
	}

	/**
	 * Adds an item to the cart.
	 * Handles merging duplicates (same product + same variant).
	 */
	addItem(product: MenuItem, quantity = 1, selectedVariant?: ProductVariant) {
		const isVariant = !!selectedVariant;

		// Generate Unique ID: "prod_123" OR "prod_123-var_456"
		const cartItemId = isVariant ? `${product.id}-${selectedVariant.id}` : product.id;

		// Check for existing
		const existingIndex = this.items.findIndex((i) => i.cartItemId === cartItemId);

		if (existingIndex > -1) {
			// Update Existing
			this.items[existingIndex].quantity += quantity;
		} else {
			// Create New
			const newItem: CartItem = {
				cartItemId,
				productId: product.id,
				variantId: selectedVariant?.id,
				name: isVariant ? `${product.name} (${selectedVariant.size_name})` : product.name,
				variantName: selectedVariant?.size_name,
				price: selectedVariant ? selectedVariant.price : product.price,
				image: product.image,
				quantity
			};
			this.items.push(newItem);
		}

		// Open cart to show user success (Optional UX choice)
		this.openCart();
		this.saveToStorage();
	}

	removeItem(cartItemId: string) {
		this.items = this.items.filter((i) => i.cartItemId !== cartItemId);
		this.saveToStorage();
	}

	updateQuantity(cartItemId: string, quantity: number) {
		if (quantity <= 0) {
			this.removeItem(cartItemId);
			return;
		}

		const item = this.items.find((i) => i.cartItemId === cartItemId);
		if (item) {
			item.quantity = quantity;
			this.saveToStorage();
		}
	}

	clearCart() {
		this.items = [];
		this.saveToStorage();
	}

	/**
	 * Converts "Order History" items back into "Cart Items"
	 * Logic: Calculates unit price from total price if needed.
	 */
	reorderItems(historyItems: OrderHistoryProduct[]) {
		// 1. Clear current cart
		this.items = [];

		// 2. Map items
		const newItems: CartItem[] = historyItems.map((h) => {
			const isVariant = !!h.variant_id;
			const cartItemId = isVariant ? `${h.product_id}-${h.variant_id}` : h.product_id;

			// Handle price: History usually stores "Total line price"
			// We need "Unit price" for the cart logic.
			const unitPrice = h.quantity > 0 ? h.price / h.quantity : h.price;

			const displayName =
				isVariant && h.variant_size ? `${h.product_name} (${h.variant_size})` : h.product_name;

			return {
				cartItemId,
				productId: h.product_id,
				variantId: h.variant_id ?? undefined,
				name: displayName,
				variantName: h.variant_size ?? undefined,
				price: unitPrice,
				image: h.image_url,
				quantity: h.quantity
			};
		});

		this.items = newItems;
		this.saveToStorage();
		this.openCart();
	}

	// --- Computed (Getters act as Derived state) ---

	get totalItems() {
		return this.items.reduce((sum, item) => sum + item.quantity, 0);
	}

	get totalPrice() {
		return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}
}

// Export Singleton
export const cartStore = new CartStore();
