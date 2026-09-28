import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { SOCKET_CHANNELS, Order } from '@upi-crypto/shared';

class WebSocketService {
  private io: Server | null = null;

  initialize(httpServer: HttpServer, corsOrigin: string) {
    this.io = new Server(httpServer, {
      cors: {
        origin: corsOrigin === '*' ? '*' : [corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.io.on('connection', (socket: Socket) => {
      socket.on('subscribe:order', (orderId: string) => {
        socket.join(`order:${orderId}`);
      });

      socket.on('subscribe:merchant', (merchantId: string) => {
        socket.join(`merchant:${merchantId}`);
      });
    });
  }

  emitOrderStatusUpdate(order: Order) {
    if (!this.io) return;

    const payload = {
      orderId: order.id,
      status: order.status,
      txHash: order.txHash,
      amountInr: order.amountInr,
      amountUsdt: order.amountUsdt,
      updatedAt: order.updatedAt
    };

    this.io.to(`order:${order.id}`).emit(SOCKET_CHANNELS.PAYMENT_STATUS_UPDATE, payload);
    this.io.to(`merchant:${order.merchantId}`).emit(SOCKET_CHANNELS.PAYMENT_STATUS_UPDATE, payload);

    if (order.status === 'COMPLETED') {
      this.io.to(`order:${order.id}`).emit(SOCKET_CHANNELS.PAYMENT_COMPLETED, order);
      this.io.to(`merchant:${order.merchantId}`).emit(SOCKET_CHANNELS.PAYMENT_COMPLETED, order);
    }
  }

  emitRateUpdate(rate: number, timestamp: number) {
    if (!this.io) return;
    this.io.emit(SOCKET_CHANNELS.RATE_UPDATE, { rate, timestamp });
  }
}

export const wsService = new WebSocketService();
