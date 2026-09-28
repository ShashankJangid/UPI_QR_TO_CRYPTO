import { Router, Request, Response } from 'express';
import { db } from '../db';
import { blockchainService } from '../services/blockchain.service';
import { BlockchainNetwork, DashboardStats } from '@upi-crypto/shared';

const router = Router();

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const merchantId = (req.query.merchantId as string) || 'merchant-default-001';
    const merchant = await db.findMerchantById(merchantId);

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant profile not found' });
    }

    return res.json(merchant);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/wallet', async (req: Request, res: Response) => {
  try {
    const { merchantId = 'merchant-default-001', walletAddress, walletNetwork = 'polygon' } = req.body;

    if (!walletAddress || !blockchainService.isValidAddress(walletAddress)) {
      return res.status(400).json({ error: 'Please enter a valid EVM wallet address (0x...)' });
    }

    const updated = await db.updateMerchantWallet(merchantId, walletAddress, walletNetwork as BlockchainNetwork);
    if (!updated) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    return res.json({
      message: 'Wallet address updated successfully',
      merchant: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const merchantId = (req.query.merchantId as string) || 'merchant-default-001';
    const limit = parseInt(req.query.limit as string || '50', 10);

    const orders = await db.getMerchantOrders(merchantId, limit);
    return res.json(orders);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchantId = (req.query.merchantId as string) || 'merchant-default-001';
    const orders = await db.getMerchantOrders(merchantId, 100);

    const successfulOrders = orders.filter(o => o.status === 'COMPLETED');
    const totalInrVolume = successfulOrders.reduce((sum, o) => sum + o.amountInr, 0);
    const totalUsdtReceived = successfulOrders.reduce((sum, o) => sum + o.amountUsdt, 0);
    const pendingOrdersCount = orders.filter(o => ['PENDING', 'UPI_PAID', 'PROCESSING_CRYPTO'].includes(o.status)).length;

    const stats: DashboardStats = {
      totalInrVolume: parseFloat(totalInrVolume.toFixed(2)),
      totalUsdtReceived: parseFloat(totalUsdtReceived.toFixed(4)),
      successfulOrdersCount: successfulOrders.length,
      pendingOrdersCount,
      recentOrders: orders.slice(0, 10)
    };

    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
