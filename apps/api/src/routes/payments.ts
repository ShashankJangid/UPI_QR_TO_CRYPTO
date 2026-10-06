import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { onrampService } from '../services/onramp.service';
import { blockchainService } from '../services/blockchain.service';
import { db } from '../db';
import { BlockchainNetwork } from '@upi-crypto/shared';

const router = Router();

router.get('/quote', async (req: Request, res: Response) => {
  try {
    const amountInr = parseFloat(req.query.amount as string || '500');
    const network = (req.query.network as BlockchainNetwork) || 'polygon';

    if (isNaN(amountInr) || amountInr <= 0) {
      return res.status(400).json({ error: 'Valid positive amount in INR is required' });
    }

    const quote = await onrampService.getQuote(amountInr, network);
    return res.json(quote);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/relayer-status', async (req: Request, res: Response) => {
  try {
    const network = (req.query.network as BlockchainNetwork) || 'polygon';
    const status = await blockchainService.getRelayerStatus(network);
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/create', async (req: Request, res: Response) => {
  try {
    const { amountInr, customerPhone, note, walletAddress, walletNetwork, merchantId } = req.body;

    if (!amountInr || typeof amountInr !== 'number' || amountInr < 10) {
      return res.status(400).json({ error: 'Minimum transaction amount is ₹10' });
    }

    const targetMerchantId = merchantId || 'merchant-default-001';

    const paymentResponse = await paymentService.createPayment(targetMerchantId, {
      amountInr,
      customerPhone,
      note,
      walletAddress,
      walletNetwork
    });

    return res.status(201).json(paymentResponse);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const order = await db.findOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json(order);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/verify-utr', async (req: Request, res: Response) => {
  try {
    const { utr, customerVpa } = req.body;
    if (!utr) {
      return res.status(400).json({ error: '12-digit Bank UTR / UPI reference number is required' });
    }

    const order = await paymentService.confirmWithUtr(req.params.id, utr, customerVpa);
    return res.json({
      message: 'UTR confirmed successfully. USDT payout initiated.',
      order
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.post('/:id/simulate', async (req: Request, res: Response) => {
  try {
    const order = await paymentService.simulatePayment(req.params.id);
    return res.json({
      message: 'Payment simulated successfully. Payout process initiated.',
      order
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await db.findOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json(order);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const order = await paymentService.retryPayout(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({
      message: 'Payout retried successfully.',
      order
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
