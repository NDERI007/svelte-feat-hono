import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface SessionToken {
	token: string;
	createdAt: number;
	usageCount: number;
}

class SessionTokenManager {
	private tokens = new Map<string, SessionToken>();
	private readonly MAX_TOKEN_AGE = 3 * 60 * 1000; // 3 minutes
	private readonly GLOBAL_SESSION_KEY = '__global_places_session__';

	// Svelte writable store for the current global token
	private tokenStore = writable<string>('');
	private sessionInfoStore = writable<SessionToken | null>(null);

	constructor() {
		if (browser) {
			this.createGlobalSession();
			// Cleanup every minute
			setInterval(() => this.cleanupExpired(), 60 * 1000);
		}
	}

	/**
	 * Get or create global session token (shared across all components)
	 */
	getGlobalToken(): string {
		const session = this.tokens.get(this.GLOBAL_SESSION_KEY);

		if (!session || this.isExpired(session)) {
			return this.createGlobalSession();
		}

		session.usageCount++;
		this.updateStores();
		return session.token;
	}

	/**
	 * Create new global session token
	 */
	createGlobalSession(): string {
		const token = crypto.randomUUID();
		const newSession: SessionToken = {
			token,
			createdAt: Date.now(),
			usageCount: 0
		};

		this.tokens.set(this.GLOBAL_SESSION_KEY, newSession);
		this.updateStores();

		console.log('🆕 New session created:', token);
		return token;
	}

	/**
	 * Terminate global session (called after Place Details)
	 */
	terminateGlobalSession(): void {
		const session = this.tokens.get(this.GLOBAL_SESSION_KEY);
		if (session) {
			console.log('✅ Session terminated after', session.usageCount, 'autocomplete calls');
		}
		this.tokens.delete(this.GLOBAL_SESSION_KEY);
		// Create new session for next search
		this.createGlobalSession();
	}

	private isExpired(session: SessionToken): boolean {
		return Date.now() - session.createdAt > this.MAX_TOKEN_AGE;
	}

	cleanupExpired(): void {
		const now = Date.now();
		let cleaned = 0;

		for (const [contextId, session] of this.tokens.entries()) {
			if (now - session.createdAt > this.MAX_TOKEN_AGE) {
				this.tokens.delete(contextId);
				cleaned++;
			}
		}

		if (cleaned > 0) {
			console.log(`🧹 Cleaned up ${cleaned} expired session(s)`);
			this.updateStores();
		}
	}

	getGlobalSessionInfo(): SessionToken | null {
		return this.tokens.get(this.GLOBAL_SESSION_KEY) || null;
	}

	/**
	 * Update Svelte stores with current values
	 */
	private updateStores(): void {
		const session = this.tokens.get(this.GLOBAL_SESSION_KEY);
		if (session) {
			this.tokenStore.set(session.token);
			this.sessionInfoStore.set({ ...session });
		} else {
			this.tokenStore.set('');
			this.sessionInfoStore.set(null);
		}
	}

	/**
	 * Get the writable store for the current token
	 */
	get token() {
		return derived(this.tokenStore, ($token) => $token);
	}

	/**
	 * Get the writable store for session info
	 */
	get sessionInfo() {
		return derived(this.sessionInfoStore, ($info) => $info);
	}
}

// Export singleton instance
export const sessionTokenManager = new SessionTokenManager();

// Export stores for reactive access
export const currentToken = sessionTokenManager.token;
export const sessionInfo = sessionTokenManager.sessionInfo;
