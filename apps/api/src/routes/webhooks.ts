import { Router, Request, Response } from 'express';
import { onrampService } from '../services/onramp.service';
import { paymentService } from '../services/payment.service';
import { db } from '../db';
import { WebhookEventPayload, WEBHOOK_EVENTS } from '@upi-crypto/shared';

const router = Router();

router.post('/onramp', async (req: Request, res: Response) => {
  const signature = req.headers['x-onramp-signature'] as string;
  const rawBody = JSON.stringify(req.body);

  if (!onrampService.verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  const payload = req.body as WebhookEventPayload;
  const { eventId, eventType, data } = payload;

  if (!eventId || !eventType) {
    return res.status(400).json({ error: 'Malformed webhook payload' });
  }

  const alreadyProcessed = await db.isWebhookProcessed(eventId);
  if (alreadyProcessed) {
    return res.status(200).json({ status: 'ALREADY_PROCESSED' });
  }

  try {
    if (eventType === WEBHOOK_EVENTS.UPI_PAYMENT_SUCCESS) {
      const order = data.orderId 
        ? await db.findOrderById(data.orderId)
        : await db.findOrderByOnrampTxnId(data.onrampTxnId);

      if (order) {
        await paymentService.handleUpiConfirmed(order.id, data.customerVpa);
      }
    } else if (eventType === WEBHOOK_EVENTS.CRYPTO_TRANSFER_SUCCESS) {
      const order = data.orderId 
        ? await db.findOrderById(data.orderId)
        : await db.findOrderByOnrampTxnId(data.onrampTxnId);

      if (order && data.txHash) {
        await db.updateOrderStatus(order.id, 'COMPLETED', {
          txHash: data.txHash,
          completedAt: new Date().toISOString()
        });
      }
    } else if (eventType === WEBHOOK_EVENTS.TRANSACTION_FAILED) {
      const order = data.orderId 
        ? await db.findOrderById(data.orderId)
        : await db.findOrderByOnrampTxnId(data.onrampTxnId);

      if (order) {
        await db.updateOrderStatus(order.id, 'FAILED', {
          errorMessage: data.failureReason || 'Transaction failed'
        });
      }
    }

    await db.recordWebhookEvent('onramp.money', eventId, eventType, payload);
    return res.status(200).json({ status: 'SUCCESS' });
  } catch {
    return res.status(500).json({ error: 'Internal processing error' });
  }
});

export default router;
