import { browser } from '$app/environment';
import type { DeliveryLocation } from '$lib/schemas/address';

export const DELIVERY_FEE = 10;
export const FREE_DELIVERY_THRESHOLD = 150;

type DeliveryOption = 'delivery' | 'pickup';

class DeliveryStore {
	// --- State (Runes) ---
	userEmail = $state<string>('guest');
	place = $state<DeliveryLocation | null>(null);
	deliveryOption = $state<DeliveryOption>('delivery');
	instructions = $state<string>('');

	private saveTimeout: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		if (browser) {
			const storedUserEmail = localStorage.getItem('delivery-user-email');
			if (storedUserEmail) {
				this.userEmail = storedUserEmail;
			}
			this.loadFromStorage();
		}
	}

	// --- Persistence Logic ---

	private getStorageKey() {
		return `delivery-storage-${this.userEmail || 'guest'}`;
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
				this.place = null;
				this.deliveryOption = 'delivery';
			}
		} else {
			this.place = null;
			this.deliveryOption = 'delivery';
			this.instructions = '';
		}
	}

	private saveToStorage() {
		if (!browser) return;

		clearTimeout(this.saveTimeout);

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

	setUserEmail(newUserEmail: string | null) {
		const userEmail = newUserEmail || 'guest';

		if (this.userEmail !== userEmail) {
			clearTimeout(this.saveTimeout);

			this.userEmail = userEmail;
			if (browser) localStorage.setItem('delivery-user-email', userEmail);

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
		this.saveToStorage();
	}

	clearDelivery() {
		this.place = null;
		this.deliveryOption = 'delivery';
		this.instructions = '';
		this.saveToStorage();
	}

	reset() {
		clearTimeout(this.saveTimeout);

		if (browser) {
			// Get the current storage key before resetting
			const currentKey = this.getStorageKey();

			// Clear current user's delivery
			localStorage.removeItem(currentKey);
			localStorage.removeItem('delivery-user-email');

			// Also clear the guest delivery
			localStorage.removeItem('delivery-storage-guest');
		}

		// Reset state AFTER clearing storage
		this.place = null;
		this.deliveryOption = 'delivery';
		this.instructions = '';
		this.userEmail = 'guest';
	}

	// --- Calculations ---

	getDeliveryFee(subtotal: number) {
		if (this.deliveryOption !== 'delivery') {
			return 0;
		}

		if (subtotal >= FREE_DELIVERY_THRESHOLD) {
			return 0;
		}

		return DELIVERY_FEE;
	}
}

export const deliveryStore = new DeliveryStore();
