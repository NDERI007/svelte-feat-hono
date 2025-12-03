import { browser } from '$app/environment';
import type { CartItem, MenuItem, ProductVariant, OrderHistoryProduct } from '$lib/schemas/menu';

class CartStore {
	// --- State (Runes) ---
	items = $state<CartItem[]>([]);
	isOpen = $state(false);
	userEmail = $state<string>('guest');

	constructor() {
		if (browser) {
			// 1. Recover User Email
			const storedUserEmail = localStorage.getItem('cart-user-email');
			if (storedUserEmail) {
				this.userEmail = storedUserEmail;
			}
			// 2. Load Cart Data
			this.loadFromStorage();
		}
	}

	// --- Persistence ---

	private getStorageKey() {
		return `cart-storage-${this.userEmail || 'guest'}`;
	}

	private loadFromStorage() {
		if (!browser) return;
		const key = this.getStorageKey();
		const stored = localStorage.getItem(key);

		if (stored) {
			try {
				const parsed = JSON.parse(stored);
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
		const data = { items: this.items };
		localStorage.setItem(key, JSON.stringify(data));
	}

	// --- Actions ---

	setUserEmail(newUserEmail: string | null) {
		const userEmail = newUserEmail || 'guest';
		if (this.userEmail !== userEmail) {
			this.userEmail = userEmail;
			if (browser) localStorage.setItem('cart-user-email', userEmail);

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

	addItem(product: MenuItem, quantity = 1, selectedVariant?: ProductVariant) {
		const isVariant = !!selectedVariant;
		const cartItemId = isVariant ? `${product.id}-${selectedVariant.id}` : product.id;
		const existingIndex = this.items.findIndex((i) => i.cartItemId === cartItemId);

		if (existingIndex > -1) {
			this.items[existingIndex].quantity += quantity;
		} else {
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

	reorderItems(historyItems: OrderHistoryProduct[]) {
		this.items = [];

		const newItems: CartItem[] = historyItems.map((h) => {
			const isVariant = !!h.variant_id;
			const cartItemId = isVariant ? `${h.product_id}-${h.variant_id}` : h.product_id;
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

	reset() {
		this.items = [];
		this.isOpen = false;

		if (browser) {
			// Get the current storage key before resetting
			const currentKey = this.getStorageKey();

			// Clear current user's cart
			localStorage.removeItem(currentKey);
			localStorage.removeItem('cart-user-email');

			// Also clear the guest cart
			localStorage.removeItem('cart-storage-guest');
		}

		// Reset to guest AFTER clearing storage
		this.userEmail = 'guest';
	}

	// --- Computed ---

	get totalItems() {
		return this.items.reduce((sum, item) => sum + item.quantity, 0);
	}

	get totalPrice() {
		return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}
}

export const cartStore = new CartStore();
