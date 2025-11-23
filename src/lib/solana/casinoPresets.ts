/**
 * Casino Preset Addresses
 * One-click "Send to casino" functionality for popular gambling sites
 */

export interface CasinoPreset {
  id: string;
  name: string;
  address: string;
  icon?: string;
  description: string;
  category: 'casino' | 'sportsbook' | 'poker' | 'other';
  verified: boolean;
  minDeposit?: number; // Minimum deposit in SOL
  fee?: number; // Network fee in SOL
}

/**
 * Known casino deposit addresses
 * Update this list as needed
 * IMPORTANT: Verify all addresses before adding
 */
export const CASINO_PRESETS: CasinoPreset[] = [
  // Note: These are placeholder addresses - replace with actual verified casino deposit addresses
  {
    id: 'roobet',
    name: 'Roobet',
    icon: '🎰',
    address: '11111111111111111111111111111111', // Placeholder - replace with actual address
    description: 'Popular crypto casino with instant deposits',
    category: 'casino',
    verified: true,
    minDeposit: 0.01,
  },
  {
    id: 'stake',
    name: 'Stake',
    icon: '🎲',
    address: '22222222222222222222222222222222', // Placeholder - replace with actual address
    description: 'Leading crypto gambling platform',
    category: 'casino',
    verified: true,
    minDeposit: 0.01,
  },
  {
    id: 'rollbit',
    name: 'Rollbit',
    icon: '🎯',
    address: '33333333333333333333333333333333', // Placeholder - replace with actual address
    description: 'Fast crypto casino and sportsbook',
    category: 'casino',
    verified: true,
    minDeposit: 0.01,
  },
  {
    id: 'bitstarz',
    name: 'Bitstarz',
    icon: '⭐',
    address: '44444444444444444444444444444444', // Placeholder - replace with actual address
    description: 'Award-winning crypto casino',
    category: 'casino',
    verified: true,
    minDeposit: 0.01,
  },
  {
    id: 'bcgame',
    name: 'BC.Game',
    icon: '🎮',
    address: '55555555555555555555555555555555', // Placeholder - replace with actual address
    description: 'Crypto casino with provably fair games',
    category: 'casino',
    verified: true,
    minDeposit: 0.01,
  },
];

/**
 * Get casino preset by ID
 */
export function getCasinoPreset(id: string): CasinoPreset | undefined {
  return CASINO_PRESETS.find(preset => preset.id === id);
}

/**
 * Get all verified casino presets
 */
export function getVerifiedPresets(): CasinoPreset[] {
  return CASINO_PRESETS.filter(preset => preset.verified);
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: CasinoPreset['category']): CasinoPreset[] {
  return CASINO_PRESETS.filter(preset => preset.category === category && preset.verified);
}

/**
 * Search presets by name
 */
export function searchPresets(query: string): CasinoPreset[] {
  const lowerQuery = query.toLowerCase();
  return CASINO_PRESETS.filter(
    preset =>
      preset.verified &&
      (preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Validate casino address format
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Add custom casino preset (user-defined)
 */
export function addCustomCasinoPreset(
  name: string,
  address: string,
  category: CasinoPreset['category'] = 'casino'
): CasinoPreset | null {
  if (!isValidSolanaAddress(address)) {
    return null;
  }

  const preset: CasinoPreset = {
    id: `custom-${Date.now()}`,
    name,
    address,
    description: `Custom ${category} preset`,
    category,
    verified: false, // User-defined presets are not verified
  };

  return preset;
}

