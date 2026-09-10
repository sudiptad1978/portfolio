/** SHA-256 hex digest (Web Crypto — available in Workers and Node 20+). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Privacy-preserving identity for rate limiting — never store raw IPs. */
export async function hashIp(ip: string): Promise<string> {
  return sha256Hex(`contact:${ip}`);
}
