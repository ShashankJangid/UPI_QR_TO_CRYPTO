import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { Merchant, Order, BlockchainNetwork, PaymentStatus } from '@upi-crypto/shared';

interface DBStore {
  merchants: Merchant[];
  orders: Order[];
  webhookEvents: { id: string; eventId: string; eventType: string; payload: any; processed: boolean; createdAt: string }[];
}

const dataDir = path.resolve(__dirname, '../../data');
const dbFilePath = path.join(dataDir, 'db.json');

class DatabaseManager {
  private pgPool: Pool | null = null;
  private isPostgresAvailable = false;
  private memoryStore: DBStore = {
    merchants: [],
    orders: [],
    webhookEvents: []
  };

  async initialize() {
    if (config.database.url) {
      try {
        const pool = new Pool({
          connectionString: config.database.url,
          connectionTimeoutMillis: 3000,
        });

        const client = await pool.connect();
        client.release();
        this.pgPool = pool;
        this.isPostgresAvailable = true;
        await this.runMigrations();
        return;
      } catch {}
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(dbFilePath)) {
      try {
        const content = fs.readFileSync(dbFilePath, 'utf-8');
        this.memoryStore = JSON.parse(content);
      } catch {
        this.saveMemoryStore();
      }
    } else {
      this.seedDefaultMerchant();
      this.saveMemoryStore();
    }
  }

  private saveMemoryStore() {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(this.memoryStore, null, 2), 'utf-8');
    } catch {}
  }

  private seedDefaultMerchant() {
    const defaultMerchant: Merchant = {
      id: 'merchant-default-001',
      email: 'merchant@store.com',
      businessName: 'Apex Electronics & Mart',
      walletAddress: config.defaultMerchantWallet,
      walletNetwork: 'polygon',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.memoryStore.merchants.push(defaultMerchant);
  }

  private async runMigrations() {
    if (!this.pgPool) return;
    try {
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      await this.pgPool.query(schemaSql);
    } catch {}
  }

  async findMerchantByEmail(email: string): Promise<Merchant | null> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM merchants WHERE email = $1 LIMIT 1', [email]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        businessName: row.business_name,
        walletAddress: row.wallet_address,
        walletNetwork: row.wallet_network as BlockchainNetwork,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString()
      };
    }

    const merchant = this.memoryStore.merchants.find(m => m.email.toLowerCase() === email.toLowerCase());
    return merchant || null;
  }

  async findMerchantById(id: string): Promise<Merchant | null> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [id]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        businessName: row.business_name,
        walletAddress: row.wallet_address,
        walletNetwork: row.wallet_network as BlockchainNetwork,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString()
      };
    }

    const merchant = this.memoryStore.merchants.find(m => m.id === id);
    return merchant || null;
  }

  async findMerchantByWalletAddress(walletAddress: string): Promise<Merchant | null> {
    const cleanAddr = walletAddress.toLowerCase();
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM merchants WHERE LOWER(wallet_address) = $1 LIMIT 1', [cleanAddr]);
      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        email: row.email,
        businessName: row.business_name,
        walletAddress: row.wallet_address,
        walletNetwork: row.wallet_network as BlockchainNetwork,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString()
      };
    }

    const merchant = this.memoryStore.merchants.find(m => m.walletAddress.toLowerCase() === cleanAddr);
    return merchant || null;
  }

  async createMerchant(merchant: Merchant): Promise<Merchant> {
    if (this.isPostgresAvailable && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO merchants (id, email, password_hash, business_name, wallet_address, wallet_network, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [merchant.id, merchant.email, 'hashed_password', merchant.businessName, merchant.walletAddress, merchant.walletNetwork, merchant.isActive, merchant.createdAt, merchant.updatedAt]
      );
      return merchant;
    }

    this.memoryStore.merchants.push(merchant);
    this.saveMemoryStore();
    return merchant;
  }

  async updateMerchantWallet(merchantId: string, walletAddress: string, network: BlockchainNetwork): Promise<Merchant | null> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query(
        `UPDATE merchants SET wallet_address = $1, wallet_network = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [walletAddress, network, merchantId]
      );
      if (res.rows.length === 0) return null;
      return this.findMerchantById(merchantId);
    }

    const merchant = this.memoryStore.merchants.find(m => m.id === merchantId);
    if (!merchant) return null;
    merchant.walletAddress = walletAddress;
    merchant.walletNetwork = network;
    merchant.updatedAt = new Date().toISOString();
    this.saveMemoryStore();
    return merchant;
  }

  async createOrder(order: Order): Promise<Order> {
    if (this.isPostgresAvailable && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO orders (id, merchant_id, amount_inr, amount_usdt, locked_rate, status, onramp_txn_id, upi_qr_data, upi_qr_image_url, destination_wallet, destination_network, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          order.id, order.merchantId, order.amountInr, order.amountUsdt, order.lockedRate,
          order.status, order.onrampTxnId, order.upiQrData, order.upiQrImageUrl,
          order.destinationWallet, order.destinationNetwork, order.expiresAt,
          order.createdAt, order.updatedAt
        ]
      );
      return order;
    }

    this.memoryStore.orders.push(order);
    this.saveMemoryStore();
    return order;
  }

  async findOrderById(orderId: string): Promise<Order | null> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM orders WHERE id = $1 LIMIT 1', [orderId]);
      if (res.rows.length === 0) return null;
      return this.mapOrderRow(res.rows[0]);
    }

    const order = this.memoryStore.orders.find(o => o.id === orderId);
    return order || null;
  }

  async findOrderByOnrampTxnId(onrampTxnId: string): Promise<Order | null> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM orders WHERE onramp_txn_id = $1 LIMIT 1', [onrampTxnId]);
      if (res.rows.length === 0) return null;
      return this.mapOrderRow(res.rows[0]);
    }

    const order = this.memoryStore.orders.find(o => o.onrampTxnId === onrampTxnId);
    return order || null;
  }

  async updateOrderStatus(
    orderId: string,
    status: PaymentStatus,
    metadata?: {
      txHash?: string;
      paidAt?: string;
      cryptoSentAt?: string;
      completedAt?: string;
      errorMessage?: string;
      customerVpa?: string;
    }
  ): Promise<Order | null> {
    const now = new Date().toISOString();

    if (this.isPostgresAvailable && this.pgPool) {
      const updates: string[] = ['status = $2', 'updated_at = $3'];
      const params: any[] = [orderId, status, now];
      let paramIdx = 4;

      if (metadata?.txHash) {
        updates.push(`tx_hash = $${paramIdx++}`);
        params.push(metadata.txHash);
      }
      if (metadata?.paidAt) {
        updates.push(`paid_at = $${paramIdx++}`);
        params.push(metadata.paidAt);
      }
      if (metadata?.cryptoSentAt) {
        updates.push(`crypto_sent_at = $${paramIdx++}`);
        params.push(metadata.cryptoSentAt);
      }
      if (metadata?.completedAt) {
        updates.push(`completed_at = $${paramIdx++}`);
        params.push(metadata.completedAt);
      }
      if (metadata?.errorMessage) {
        updates.push(`error_message = $${paramIdx++}`);
        params.push(metadata.errorMessage);
      }
      if (metadata?.customerVpa) {
        updates.push(`customer_vpa = $${paramIdx++}`);
        params.push(metadata.customerVpa);
      }

      await this.pgPool.query(
        `UPDATE orders SET ${updates.join(', ')} WHERE id = $1`,
        params
      );

      return this.findOrderById(orderId);
    }

    const order = this.memoryStore.orders.find(o => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = now;
    if (metadata?.txHash) order.txHash = metadata.txHash;
    if (metadata?.paidAt) order.paidAt = metadata.paidAt;
    if (metadata?.cryptoSentAt) order.cryptoSentAt = metadata.cryptoSentAt;
    if (metadata?.completedAt) order.completedAt = metadata.completedAt;
    if (metadata?.errorMessage) order.errorMessage = metadata.errorMessage;
    if (metadata?.customerVpa) order.customerVpa = metadata.customerVpa;

    this.saveMemoryStore();
    return order;
  }

  async getMerchantOrders(merchantId: string, limit = 50): Promise<Order[]> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query(
        'SELECT * FROM orders WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2',
        [merchantId, limit]
      );
      return res.rows.map(this.mapOrderRow);
    }

    return this.memoryStore.orders
      .filter(o => o.merchantId === merchantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getStalePendingOrders(olderThanMinutes = 5): Promise<Order[]> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT * FROM orders WHERE status IN ('PENDING', 'UPI_PAID', 'PROCESSING_CRYPTO') AND created_at < $1`,
        [cutoff]
      );
      return res.rows.map(this.mapOrderRow);
    }

    return this.memoryStore.orders.filter(
      o => ['PENDING', 'UPI_PAID', 'PROCESSING_CRYPTO'].includes(o.status) && o.createdAt < cutoff
    );
  }

  async isWebhookProcessed(eventId: string): Promise<boolean> {
    if (this.isPostgresAvailable && this.pgPool) {
      const res = await this.pgPool.query('SELECT 1 FROM webhook_events WHERE event_id = $1 LIMIT 1', [eventId]);
      return res.rows.length > 0;
    }
    return this.memoryStore.webhookEvents.some(w => w.eventId === eventId);
  }

  async recordWebhookEvent(provider: string, eventId: string, eventType: string, payload: any): Promise<void> {
    const id = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    if (this.isPostgresAvailable && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO webhook_events (id, provider, event_id, event_type, payload, processed, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (event_id) DO NOTHING`,
        [id, provider, eventId, eventType, JSON.stringify(payload), true, now]
      );
      return;
    }

    this.memoryStore.webhookEvents.push({
      id,
      eventId,
      eventType,
      payload,
      processed: true,
      createdAt: now
    });
    this.saveMemoryStore();
  }

  private mapOrderRow(row: any): Order {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      amountInr: parseFloat(row.amount_inr),
      amountUsdt: parseFloat(row.amount_usdt),
      lockedRate: parseFloat(row.locked_rate),
      status: row.status as PaymentStatus,
      onrampTxnId: row.onramp_txn_id,
      upiQrData: row.upi_qr_data,
      upiQrImageUrl: row.upi_qr_image_url,
      txHash: row.tx_hash,
      destinationWallet: row.destination_wallet,
      destinationNetwork: row.destination_network as BlockchainNetwork,
      customerVpa: row.customer_vpa,
      customerPhone: row.customer_phone,
      expiresAt: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
      paidAt: row.paid_at ? (row.paid_at instanceof Date ? row.paid_at.toISOString() : row.paid_at) : undefined,
      cryptoSentAt: row.crypto_sent_at ? (row.crypto_sent_at instanceof Date ? row.crypto_sent_at.toISOString() : row.crypto_sent_at) : undefined,
      completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : row.completed_at) : undefined,
      errorMessage: row.error_message,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
    };
  }
}

export const db = new DatabaseManager();
