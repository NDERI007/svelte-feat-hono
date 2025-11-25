import { getContext, setContext } from 'svelte';
import { goto } from '$app/navigation';
type User = {
	email: string;
	role: string;
	two_factor_enabled: boolean;
} | null;

class AuthState {
	user = $state<User>(null);

	constructor(initialUser: User) {
		this.user = initialUser;
	}

	setUser(user: User) {
		this.user = user;
	}

	get isAuthenticated() {
		return this.user !== null;
	}

	get isAdmin() {
		return this.user?.role === 'admin';
	}

	async logout() {
		try {
			await fetch('/api/auth/logout');
			this.user = null;

			await goto('/login', {
				// 1. Force server data to refresh (clears the old user from +layout.server.ts)
				invalidateAll: true,

				// 2. Replace History (Crucial for Logout)
				// This prevents the user from clicking the browser's "Back" button
				// and seeing the protected dashboard again.
				replaceState: true
			});
		} catch (err) {
			console.error('Logout failed:', err);
		}
	}
}

const AUTH_KEY = Symbol('auth');

export function setAuthState(initialUser: User) {
	const auth = new AuthState(initialUser);
	setContext(AUTH_KEY, auth);
	return auth;
}

export function getAuthState() {
	return getContext<AuthState>(AUTH_KEY);
}
