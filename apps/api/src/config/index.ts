import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-prod',
  
  merchantUpi: {
    vpa: process.env.MERCHANT_UPI_VPA || 'merchant.crypto@icici',
    businessName: process.env.MERCHANT_BUSINESS_NAME || 'Crypto Merchant Store',
    mcc: process.env.MERCHANT_MCC || '5411',
  },

  payoutMode: (process.env.PAYOUT_MODE || 'relayer') as 'relayer' | 'onramp_api',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',

  database: {
    url: process.env.DATABASE_URL || '',
  },
  
  redis: {
    url: process.env.REDIS_URL || '',
  },
  
  onramp: {
    environment: process.env.ONRAMP_ENVIRONMENT || 'sandbox',
    apiKey: process.env.ONRAMP_API_KEY || '',
    apiSecret: process.env.ONRAMP_API_SECRET || '',
    webhookSecret: process.env.ONRAMP_WEBHOOK_SECRET || '',
    baseUrl: process.env.ONRAMP_BASE_URL || 'https://api.onramp.money',
  },
  
  blockchain: {
    polygonRpc: process.env.POLYGON_RPC_URL || 'https://polygon-bor-rpc.publicnode.com',
    polygonUsdtContract: process.env.POLYGON_USDT_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    polygonAmoyRpc: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    polygonAmoyUsdtContract: process.env.POLYGON_AMOY_USDT_CONTRACT || '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
    bscRpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org',
    bscUsdtContract: process.env.BSC_USDT_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
  },
  
  defaultMerchantWallet: process.env.DEFAULT_MERCHANT_WALLET || '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
};
