// Global party type constants for payer/payee roles
export const PARTY_TYPE = {
  BUYER: 'BUYER',
  FARMER: 'FARMER',
  SHOP: 'SHOP',
  EXTERNAL: 'EXTERNAL',
} as const;

export type PartyType = typeof PARTY_TYPE[keyof typeof PARTY_TYPE];
