import cron from 'node-cron';
import { db } from '../db';
import { wsService } from '../services/websocket.service';

export function startOrphanRecoveryWorker() {
  cron.schedule('*/2 * * * *', async () => {
    try {
      const now = new Date();
      const staleOrders = await db.getStalePendingOrders(10);

      for (const order of staleOrders) {
        const expiresAt = new Date(order.expiresAt);
        if (now > expiresAt && order.status === 'PENDING') {
          const updated = await db.updateOrderStatus(order.id, 'EXPIRED', {
            errorMessage: 'Payment window of 10 minutes elapsed before UPI scan.'
          });
          if (updated) {
            wsService.emitOrderStatusUpdate(updated);
          }
        }
      }
    } catch (err: any) {
      console.error(err.message);
    }
  });
}
