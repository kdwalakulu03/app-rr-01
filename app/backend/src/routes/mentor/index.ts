import { Router } from 'express';

import { snapRouter } from './snap.js';
import { routesCrudRouter } from './routes-crud.js';
import { pinsCrudRouter } from './pins-crud.js';
import { segmentsCrudRouter } from './segments-crud.js';
import { areasCrudRouter } from './areas-crud.js';
import { geojsonRouter } from './geojson.js';
import { publishRouter } from './publish.js';
import { publicRouter } from './public.js';

// ============================================
// Authenticated mentor router
// ============================================
export const mentorRouter = Router();

mentorRouter.use(snapRouter);       // POST /snap-route
mentorRouter.use(routesCrudRouter); // /routes CRUD
mentorRouter.use(pinsCrudRouter);   // /routes/:id/pins CRUD
mentorRouter.use(segmentsCrudRouter); // /routes/:id/segments CRUD
mentorRouter.use(areasCrudRouter);  // /routes/:id/areas CRUD
mentorRouter.use(geojsonRouter);    // GET /routes/:id/geojson
mentorRouter.use(publishRouter);    // POST /routes/:id/publish

// ============================================
// Public mentor router (no auth)
// ============================================
export const mentorPublicRouter = Router();

mentorPublicRouter.use(publicRouter); // GET / and GET /:id
