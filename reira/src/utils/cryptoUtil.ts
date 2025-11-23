export async function generateOTP(): Promise<string> {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Modulo to get 6 digits (0-999999) then pad
  const num = array[0] % 1000000;
  return num.toString().padStart(6, "0");
}

/**
 * Timing Safe String Comparison (Prevents Timing Attacks)
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
