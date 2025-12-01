export function normalizeMnemonic(input: string): string[] {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function isLikelyValidMnemonic(words: string[]): boolean {
  // Basic checks: 12/15/18/21/24 word count and alphabetic
  const validCounts = new Set([12, 15, 18, 21, 24]);
  if (!validCounts.has(words.length)) return false;
  if (!words.every((w) => /^[a-z]+$/.test(w))) return false;
  // Placeholder for checksum validation; to be replaced with BIP39 later
  return true;
}

export function deriveAddressPlaceholder(words: string[]): string {
  // Placeholder derivation: return a deterministic mock based on words length
  // Replace with actual chain-specific derivation (e.g., Solana ed25519 from mnemonic)
  const len = words.length;
  const suffix = String(len).padStart(2, '0');
  return `MockAddress_${suffix}_${Math.abs(hash(words.join(' '))).toString(16).slice(0, 8)}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}