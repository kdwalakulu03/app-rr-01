import { Router } from 'express';
import { checkDatabaseHealth } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const dbHealthy = await checkDatabaseHealth();
  
  res.json({
    status: 'ok',
    server: 'running',
    database: dbHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: '4.0.0',
  });
});
