import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { checkDatabaseHealth } from './db/index.js';
import { healthRouter } from './routes/health.js';
import { placesRouter } from './routes/places.js';
import { routesRouter } from './routes/routes.js';
import { tripsRouter } from './routes/trips.js';
import { autopilotRouter } from './routes/autopilot.js';
import { countriesRouter } from './routes/countries.js';
import { itineraryRouter } from './routes/itinerary.js';
import { spatialRouter } from './routes/spatial.js';
import { usersRouter } from './routes/users.js';
import { mentorRouter, mentorPublicRouter } from './routes/mentor/index.js';
import { exportRouter } from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { ensureUser } from './middleware/ensureUser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use('/api/health', healthRouter);
app.use('/api/countries', countriesRouter);
app.use('/api/places', placesRouter);
app.use('/api/routes', routesRouter);
app.use('/api/spatial', spatialRouter);  // GIS network — public reads
app.use('/api/mentor/public', mentorPublicRouter);  // Published mentor routes — public reads

// Protected routes (require auth + ensure user exists in DB)
app.use('/api/users', authMiddleware, ensureUser, usersRouter);
app.use('/api/trips', authMiddleware, ensureUser, tripsRouter);
app.use('/api/autopilot', authMiddleware, ensureUser, autopilotRouter);
app.use('/api/itinerary', authMiddleware, ensureUser, itineraryRouter);
app.use('/api/trips/export', authMiddleware, ensureUser, exportRouter);
app.use('/api/mentor', authMiddleware, ensureUser, mentorRouter);

// Error handler
app.use(errorHandler);

// Start server
async function start() {
  // Check database connection
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    console.error('❌ Cannot connect to database. Please check DATABASE_URL.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌍  Roam Richer API Server                               ║
║                                                           ║
║   Local:    http://localhost:${PORT}                        ║
║   Health:   http://localhost:${PORT}/api/health              ║
║                                                           ║
║   Ready to help travelers explore the world! 🚀           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

start();
