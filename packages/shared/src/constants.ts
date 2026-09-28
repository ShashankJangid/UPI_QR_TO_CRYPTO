export const USDT_CONTRACTS: Record<string, { address: string; decimals: number; explorer: string }> = {
  polygon: {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
    explorer: 'https://polygonscan.com/tx/'
  },
  bsc: {
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    explorer: 'https://bscscan.com/tx/'
  },
  ethereum: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    explorer: 'https://etherscan.io/tx/'
  }
};

export const DEFAULT_RATE = {
  INR_PER_USDT: 89.50,
  BASE_FEE_PERCENT: 1.5,
  TDS_PERCENT: 1.0,
  QUOTE_VALIDITY_SECONDS: 600
};

export const WEBHOOK_EVENTS = {
  UPI_PAYMENT_SUCCESS: 'UPI_PAYMENT_SUCCESS',
  CRYPTO_TRANSFER_SUCCESS: 'CRYPTO_TRANSFER_SUCCESS',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_EXPIRED: 'TRANSACTION_EXPIRED'
} as const;

export const SOCKET_CHANNELS = {
  PAYMENT_STATUS_UPDATE: 'payment:status_update',
  PAYMENT_COMPLETED: 'payment:completed',
  RATE_UPDATE: 'rate:update'
} as const;
