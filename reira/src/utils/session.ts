export async function generateOTP(): Promise<string> {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Modulo to get 6 digits (0-999999) then pad
  const num = array[0] % 1000000;
  return num.toString().padStart(6, "0");
}
/**
 * Constant-time comparison for byte arrays (session hash verification)
 */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  let c = 0;
  for (let i = 0; i < a.byteLength; i++) {
    c |= a[i] ^ b[i];
  }
  return c === 0;
}

/**
 * Constant-time comparison for strings (OTP verification)
 * Replaces crypto.timingSafeEqual
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  let result = 0;
  for (let i = 0; i < aBuf.length; i++) {
    result |= aBuf[i] ^ bBuf[i];
  }
  return result === 0;
}

export function generateSecureRandomString(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] >> 3];
  }
  return result;
}

/**
 * Hash a session secret using SHA-256
 */
export async function hashSecret(secret: string): Promise<Uint8Array> {
  const secretBytes = new TextEncoder().encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", secretBytes);
  return new Uint8Array(hashBuffer);
}

/**
 * Convert Uint8Array to base64 for Redis storage
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Convert base64 string back to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
