import { browser } from '$app/environment';
import type { DeliveryLocation } from '$lib/schemas/address';

// Constants
export const DELIVERY_FEE = 10;
export const FREE_DELIVERY_THRESHOLD = 150;

type DeliveryOption = 'delivery' | 'pickup';

class DeliveryStore {
	// --- State (Runes) ---
	userId = $state<string>('guest');
	place = $state<DeliveryLocation | null>(null);
	deliveryOption = $state<DeliveryOption>('delivery');

	// Example of a field that might change frequently (typing instructions)
	instructions = $state<string>('');

	// Internal timer for the debounce logic
	private saveTimeout: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		if (browser) {
			// 1. Recover the last used User ID
			const storedUserId = localStorage.getItem('delivery-user-id');
			if (storedUserId) {
				this.userId = storedUserId;
			}

			// 2. Load data for that specific user
			this.loadFromStorage();
		}
	}

	// --- Persistence Logic ---

	private getStorageKey() {
		return `delivery-storage-${this.userId || 'guest'}`;
	}

	private loadFromStorage() {
		if (!browser) return;

		const key = this.getStorageKey();
		const stored = localStorage.getItem(key);

		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				this.place = parsed.place ?? null;
				this.deliveryOption = parsed.deliveryOption ?? 'delivery';
				this.instructions = parsed.instructions ?? '';
			} catch (e) {
				console.error('Failed to parse delivery storage', e);
				// Fallback defaults
				this.place = null;
				this.deliveryOption = 'delivery';
			}
		} else {
			// No data for this user? Reset to defaults.
			this.place = null;
			this.deliveryOption = 'delivery';
			this.instructions = '';
		}
	}

	/**
	 * Saves to LocalStorage with a 500ms delay.
	 * This prevents writing to disk on every single keystroke.
	 */
	private saveToStorage() {
		if (!browser) return;

		// 1. Cancel previous pending save
		clearTimeout(this.saveTimeout);

		// 2. Schedule new save
		this.saveTimeout = setTimeout(() => {
			const key = this.getStorageKey();
			const data = {
				place: this.place,
				deliveryOption: this.deliveryOption,
				instructions: this.instructions
			};

			localStorage.setItem(key, JSON.stringify(data));
		}, 500);
	}

	// --- Actions ---

	setUserId(newUserId: string | null) {
		const userId = newUserId || 'guest';

		// Only act if the ID actually changed
		if (this.userId !== userId) {
			// Important: Cancel any pending save from the OLD user
			// so we don't overwrite the new user's data with old data.
			clearTimeout(this.saveTimeout);

			this.userId = userId;
			if (browser) localStorage.setItem('delivery-user-id', userId);

			// Now load the fresh state for the NEW user
			this.loadFromStorage();
		}
	}

	setDeliveryAddress(place: DeliveryLocation) {
		this.place = place;
		this.saveToStorage();
	}

	changeLocation() {
		this.place = null;
		this.saveToStorage();
	}

	setDeliveryOption(option: DeliveryOption) {
		this.deliveryOption = option;
		this.saveToStorage();
	}

	setInstructions(text: string) {
		this.instructions = text;
		this.saveToStorage(); // Safe to call on every keystroke
	}

	clearDelivery() {
		this.place = null;
		this.deliveryOption = 'delivery';
		this.instructions = '';
		this.saveToStorage();
	}

	// --- Calculations ---

	getDeliveryFee(subtotal: number) {
		// Pickup is always free
		if (this.deliveryOption !== 'delivery') {
			return 0;
		}

		// Free delivery threshold
		if (subtotal >= FREE_DELIVERY_THRESHOLD) {
			return 0;
		}

		return DELIVERY_FEE;
	}
}

// Export Singleton
export const deliveryStore = new DeliveryStore();
