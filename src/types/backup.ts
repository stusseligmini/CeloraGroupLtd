export interface RecoveryManifest {
  version: number; // increment when structure changes
  createdAt: string; // ISO timestamp
  chain: 'solana' | 'ethereum' | 'polygon' | string;
  walletAddress: string;
  // Encrypted seed or key material; format depends on chain/implementation
  encryptedSeed?: string;
  encryptionMethod?: 'aes-gcm' | 'libsodium' | string;
  // Optional username bound to this wallet for easier restoration UX
  username?: string;
  // Guardians or recovery contacts (if social recovery is enabled)
  guardians?: Array<{
    contact: string; // email/phone/telegram handle
    publicKey?: string; // when applicable
  }>;
  // Additional metadata helpful during restore
  metadata?: Record<string, unknown>;
}

export type RecoveryManifestV1 = RecoveryManifest;