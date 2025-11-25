import type { Category, MenuItem } from '$lib/schemas/menu';
import { supabase } from '$lib/utils/supabase/supabase';
import { browser } from '$app/environment';

const API_BASE = 'http://127.0.0.1:8787';

class CategoryResource {
	data = $state<Category[]>([]);
	loading = $state(false);
	initialized = false;

	constructor() {}

	init() {
		// Guard: Stop execution on the server
		if (!browser) return;

		if (this.initialized) return;
		this.initialized = true;
		this.fetchData();
	}

	async fetchData() {
		// Double Guard: Ensure fetch never runs on server
		if (!browser) return;

		this.loading = true;
		try {
			const res = await fetch(`${API_BASE}/api/prod/categories`);
			if (res.ok) {
				this.data = await res.json();
			}
		} catch (e) {
			console.error('Category fetch failed', e);
		} finally {
			this.loading = false;
		}
	}
}

class MenuResource {
	// --- State ---
	data = $state<MenuItem[]>([]);
	loading = $state(false);
	activeCategoryId = $state<string | null>('all');

	private channel: ReturnType<typeof supabase.channel> | null = null;
	private initialized = false;

	// --- Actions ---

	init() {
		// Guard: Stop execution on the server
		if (!browser) return;

		if (this.initialized) return;
		this.initialized = true;

		// 1. Initial Load
		this.fetchData();

		// 2. Start Listening
		this.subscribe();
	}

	setCategory(id: string | null) {
		if (this.activeCategoryId === id) return;
		this.activeCategoryId = id;
		this.fetchData();
	}

	async reload() {
		await this.fetchData();
	}

	// --- Internals ---

	private async fetchData() {
		// Guard: Stop execution on the server
		if (!browser) return;

		this.loading = true;
		try {
			let url = `${API_BASE}/api/prod/menu-items`;

			// Apply filter if specific category selected
			if (this.activeCategoryId && this.activeCategoryId !== 'all') {
				url += `?category_id=${this.activeCategoryId}`;
			}

			// FIX: Use the dynamic 'url' variable, not the hardcoded constant
			const res = await fetch(url);

			if (res.ok) {
				this.data = await res.json();
			}
		} catch (e) {
			console.error('Menu fetch failed', e);
		} finally {
			this.loading = false;
		}
	}

	private subscribe() {
		if (!browser) return; // Don't subscribe on server

		this.channel = supabase
			.channel('live-menu-items')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
				console.log('⚡ Menu updated, refreshing...');
				this.fetchData();
			})
			.subscribe();
	}

	cleanup() {
		if (this.channel) {
			supabase.removeChannel(this.channel);
			this.channel = null;
		}
	}
}

// --- EXPORTS ---
export const categoryStore = new CategoryResource();
export const menuStore = new MenuResource();
