import { db } from '../db';
import { onrampService } from './onramp.service';
import { blockchainService } from './blockchain.service';
import { wsService } from './websocket.service';
import { Order, CreatePaymentRequest, CreatePaymentResponse, BlockchainNetwork } from '@upi-crypto/shared';

export class PaymentService {
  async createPayment(merchantId: string, req: CreatePaymentRequest): Promise<CreatePaymentResponse> {
    const merchant = await db.findMerchantById(merchantId);
    if (!merchant) {
      throw new Error(`Merchant with id ${merchantId} not found`);
    }

    const network: BlockchainNetwork = req.walletNetwork || merchant.walletNetwork || 'polygon';
    const walletAddress = req.walletAddress || merchant.walletAddress;

    if (!blockchainService.isValidAddress(walletAddress)) {
      throw new Error(`Invalid destination EVM wallet address: ${walletAddress}`);
    }

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const onrampRes = await onrampService.createTransaction(
      orderId,
      req.amountInr,
      walletAddress,
      network
    );

    const now = new Date();
    const expiresAt = new Date(now.getTime() + onrampRes.expiresInSeconds * 1000).toISOString();

    const order: Order = {
      id: orderId,
      merchantId,
      amountInr: req.amountInr,
      amountUsdt: onrampRes.estimatedUsdt,
      lockedRate: onrampRes.lockedRate,
      status: 'PENDING',
      onrampTxnId: onrampRes.onrampTxnId,
      upiQrData: onrampRes.upiQrData,
      upiQrImageUrl: onrampRes.upiQrImageUrl,
      destinationWallet: walletAddress,
      destinationNetwork: network,
      customerPhone: req.customerPhone,
      expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await db.createOrder(order);
    wsService.emitOrderStatusUpdate(order);

    return {
      orderId: order.id,
      amountInr: order.amountInr,
      amountUsdt: order.amountUsdt,
      lockedRate: order.lockedRate,
      status: order.status,
      upiQrData: order.upiQrData || '',
      upiQrImageUrl: order.upiQrImageUrl || '',
      upiDeepLink: onrampRes.upiDeepLink,
      destinationWallet: order.destinationWallet,
      destinationNetwork: order.destinationNetwork,
      expiresAt: order.expiresAt,
      validSeconds: onrampRes.expiresInSeconds
    };
  }

  async handleUpiConfirmed(orderId: string, customerVpa?: string, utrNumber?: string): Promise<Order | null> {
    const existing = await db.findOrderById(orderId);
    if (!existing) return null;

    if (existing.status !== 'PENDING') {
      return existing;
    }

    const updated = await db.updateOrderStatus(orderId, 'UPI_PAID', {
      paidAt: new Date().toISOString(),
      customerVpa: customerVpa ? `${customerVpa}${utrNumber ? ` [UTR: ${utrNumber}]` : ''}` : (utrNumber ? `UTR: ${utrNumber}` : undefined)
    });

    if (updated) {
      wsService.emitOrderStatusUpdate(updated);

      setTimeout(() => {
        this.dispatchCryptoPayout(orderId);
      }, 1000);
    }

    return updated;
  }

  async dispatchCryptoPayout(orderId: string): Promise<Order | null> {
    const order = await db.findOrderById(orderId);
    if (!order || order.status === 'COMPLETED') return order;

    let current = await db.updateOrderStatus(orderId, 'PROCESSING_CRYPTO');
    if (current) wsService.emitOrderStatusUpdate(current);

    try {
      const dispatchResult = await blockchainService.sendUsdt(
        order.destinationWallet,
        order.amountUsdt,
        order.destinationNetwork
      );

      const completed = await db.updateOrderStatus(orderId, 'COMPLETED', {
        txHash: dispatchResult.txHash,
        cryptoSentAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      if (completed) {
        wsService.emitOrderStatusUpdate(completed);
      }

      return completed;
    } catch (err: any) {
      const failed = await db.updateOrderStatus(orderId, 'FAILED', {
        errorMessage: err.message
      });
      if (failed) wsService.emitOrderStatusUpdate(failed);
      return failed;
    }
  }

  async confirmWithUtr(orderId: string, utr: string, customerVpa?: string): Promise<Order | null> {
    const cleanUtr = utr.trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      throw new Error('Please enter a valid 12-digit Bank UTR / UPI reference number');
    }

    return this.handleUpiConfirmed(orderId, customerVpa || 'UPI-Direct', cleanUtr);
  }

  async simulatePayment(orderId: string): Promise<Order | null> {
    return this.handleUpiConfirmed(orderId, 'testuser@okaxis', `SIM${Date.now().toString().slice(-9)}`);
  }
}

export const paymentService = new PaymentService();
