export type BlockchainNetwork = 'polygon' | 'bsc' | 'ethereum' | 'solana' | 'tron';

export type PaymentStatus = 
  | 'CREATED'
  | 'PENDING'
  | 'UPI_PAID'
  | 'PROCESSING_CRYPTO'
  | 'CRYPTO_DISPATCHED'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export interface Merchant {
  id: string;
  email: string;
  businessName: string;
  walletAddress: string;
  walletNetwork: BlockchainNetwork;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  merchantId: string;
  amountInr: number;
  amountUsdt: number;
  lockedRate: number;
  status: PaymentStatus;
  onrampTxnId?: string;
  upiQrData?: string;
  upiQrImageUrl?: string;
  txHash?: string;
  destinationWallet: string;
  destinationNetwork: BlockchainNetwork;
  customerVpa?: string;
  customerPhone?: string;
  expiresAt: string;
  paidAt?: string;
  cryptoSentAt?: string;
  completedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRequest {
  amountInr: number;
  network?: BlockchainNetwork;
}

export interface QuoteResponse {
  amountInr: number;
  estimatedUsdt: number;
  rate: number;
  validForSeconds: number;
  network: BlockchainNetwork;
  feeInr: number;
  tdsInr: number;
  merchantReceivesUsdt: number;
  timestamp: number;
}

export interface CreatePaymentRequest {
  amountInr: number;
  customerPhone?: string;
  note?: string;
  walletAddress?: string;
  walletNetwork?: BlockchainNetwork;
}

export interface CreatePaymentResponse {
  orderId: string;
  amountInr: number;
  amountUsdt: number;
  lockedRate: number;
  status: PaymentStatus;
  upiQrData: string;
  upiQrImageUrl: string;
  upiDeepLink: string;
  destinationWallet: string;
  destinationNetwork: BlockchainNetwork;
  expiresAt: string;
  validSeconds: number;
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: 'UPI_PAYMENT_SUCCESS' | 'CRYPTO_TRANSFER_SUCCESS' | 'TRANSACTION_FAILED' | 'TRANSACTION_EXPIRED';
  data: {
    orderId?: string;
    onrampTxnId: string;
    amountInr: number;
    amountUsdt?: number;
    customerVpa?: string;
    txHash?: string;
    walletAddress?: string;
    network?: string;
    status: string;
    failureReason?: string;
    timestamp: number;
  };
}

export interface DashboardStats {
  totalInrVolume: number;
  totalUsdtReceived: number;
  successfulOrdersCount: number;
  pendingOrdersCount: number;
  recentOrders: Order[];
}
