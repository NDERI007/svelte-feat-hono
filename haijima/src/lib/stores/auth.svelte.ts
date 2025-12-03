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
		await goto('/logout');
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
