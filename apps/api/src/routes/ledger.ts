import { Router, Request, Response } from 'express';
import { ledgerService } from '../services/ledger.service';
import { db } from '../db';

const router = Router();

router.get('/audit', async (req: Request, res: Response) => {
  try {
    const report = await ledgerService.verifyLedgerIntegrity();
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/entries', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const orderId = req.query.orderId as string;

    if (orderId) {
      const entries = await db.getLedgerEntriesByOrderId(orderId);
      return res.json(entries);
    }

    const all = await db.getAllLedgerEntries();
    return res.json(all.slice(-limit).reverse());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
