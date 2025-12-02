import { goto } from '$app/navigation';
import { PUBLIC_API_URL } from '$env/static/public';

const API_BASE = PUBLIC_API_URL;

class SettingsStore {
	// --- State (Runes) ---
	twoFactorEnabled = $state(false);

	// QR Setup
	showQRCode = $state(false);
	qrCodeUrl = $state('');
	secret = $state('');
	verificationCode = $state('');

	// Recovery Codes
	recoveryCodes = $state<string[]>([]);
	showRecoveryCodes = $state(false);

	// UI State
	showDeleteConfirm = $state(false);
	loading = $state(false);
	error = $state<string | null>(null);

	// --- Actions ---

	async fetchMfaStatus() {
		// Optional: Call this onMount to check if 2FA is already enabled
		// You might need a new endpoint for this: GET /api/mfa/status
	}

	async toggleTwoFactor(currentlyEnabled: boolean) {
		if (currentlyEnabled) {
			// Disable
			await this.apiCall('/api/mfa/disable', 'POST');
			if (!this.error) this.twoFactorEnabled = false;
		} else {
			// Enable (Start Setup)
			const res = await this.apiCall('/api/mfa/setup', 'POST');
			if (res) {
				this.qrCodeUrl = res.qrCode;
				this.secret = res.secret;
				this.showQRCode = true;
			}
		}
	}

	async verifyAndEnable2FA() {
		const res = await this.apiCall('/api/mfa/verify', 'POST', {
			token: this.verificationCode,
			secret: this.secret
		});

		if (res) {
			this.recoveryCodes = res.recoveryCodes;
			this.showRecoveryCodes = true;
			this.twoFactorEnabled = true;
			this.resetQRCodeSetup();
		}
	}

	async regenerateRecoveryCodes() {
		const res = await this.apiCall('/api/mfa/regenerate-codes', 'POST');
		if (res) {
			this.recoveryCodes = res.recoveryCodes;
			this.showRecoveryCodes = true;
		}
	}

	async deleteAccount() {
		const success = await this.apiCall('/api/profile/account', 'DELETE');
		if (success) {
			goto('/');
		} else {
			this.showDeleteConfirm = false;
		}
	}

	// --- Helper for API Calls ---
	private async apiCall(path: string, method: string, body?: any) {
		this.loading = true;
		this.error = null;
		try {
			const res = await fetch(`${API_BASE}${path}`, {
				method,
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: body ? JSON.stringify(body) : undefined
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.message || 'Action failed');
			}

			// Return JSON if exists, else true
			const contentType = res.headers.get('content-type');
			if (contentType && contentType.indexOf('application/json') !== -1) {
				return await res.json();
			}
			return true;
		} catch (err: any) {
			this.error = err.message || 'An unexpected error occurred';
			return null;
		} finally {
			this.loading = false;
		}
	}

	resetQRCodeSetup() {
		this.showQRCode = false;
		this.verificationCode = '';
		this.error = null;
	}
}

// Export singleton or create new instance per page if preferred
export const settingsStore = new SettingsStore();
