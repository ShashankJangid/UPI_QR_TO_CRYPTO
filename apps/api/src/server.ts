import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { db } from './db';
import { wsService } from './services/websocket.service';
import { startOrphanRecoveryWorker } from './workers/orphan-recovery.worker';
import paymentsRouter from './routes/payments';
import webhooksRouter from './routes/webhooks';
import merchantsRouter from './routes/merchants';
import ledgerRouter from './routes/ledger';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: config.corsOrigin === '*' ? '*' : [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  app.use(express.json({ limit: '1mb' }));

  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 180,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again shortly.' }
  });
  app.use('/api/', generalLimiter);

  const paymentCreationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Payment creation rate limit exceeded. Please wait a moment.' }
  });
  app.use('/api/v1/payments/create', paymentCreationLimiter);

  const utrVerifyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Verification attempt limit reached. Please wait before retrying.' }
  });
  app.use('/api/v1/payments/:id/verify-utr', utrVerifyLimiter);

  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'upi-crypto-api',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv
    });
  });

  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/webhooks', webhooksRouter);
  app.use('/api/v1/merchants', merchantsRouter);
  app.use('/api/v1/ledger', ledgerRouter);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || 'An unexpected internal error occurred'
    });
  });

  await db.initialize();
  wsService.initialize(server, config.corsOrigin);
  startOrphanRecoveryWorker();

  server.listen(config.port, () => {
    console.log(`UPI Gateway API running on port ${config.port}`);
  });
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
