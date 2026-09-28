import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { db } from './db';
import { wsService } from './services/websocket.service';
import { startOrphanRecoveryWorker } from './workers/orphan-recovery.worker';
import paymentsRouter from './routes/payments';
import webhooksRouter from './routes/webhooks';
import merchantsRouter from './routes/merchants';

async function bootstrap() {
  const app = express();
  const server = http.createServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: config.corsOrigin === '*' ? '*' : [config.corsOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }));
  app.use(express.json());

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
