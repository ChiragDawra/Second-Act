import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { accessLog, authenticate, requestId, type Deps } from './http/context.ts';
import { ApiError, errorHandler } from './http/errors.ts';
import { adminRoutes } from './routes/admin.ts';
import { commonRoutes } from './routes/common.ts';
import { mentorRoutes } from './routes/mentor.ts';
import { ncrRoutes } from './routes/ncr.ts';
import { recruiterRoutes } from './routes/recruiter.ts';
import { workerRoutes } from './routes/worker.ts';

export interface AppOptions extends Deps {
  corsOrigins: string[];
  logRequests?: boolean;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());
  if (options.logRequests) app.use(accessLog());
  app.use(helmet());
  app.use(
    cors({
      // Native apps send no Origin header; browsers (Expo web) must be allow-listed.
      origin: (origin, cb) => cb(null, !origin || options.corsOrigins.includes(origin)),
      allowedHeaders: ['authorization', 'content-type', 'x-request-id'],
      exposedHeaders: ['x-request-id'],
      methods: ['GET', 'POST', 'PATCH'],
    }),
  );
  app.use(rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/v1/health', (_req, res) => {
    res.json({ status: 'ok', service: 'second-act-api', time: new Date().toISOString() });
  });

  const api = express.Router();
  api.use(authenticate(options));
  api.use(commonRoutes(options));
  api.use(workerRoutes(options));
  api.use(ncrRoutes(options));
  api.use(mentorRoutes(options));
  api.use(recruiterRoutes(options));
  api.use(adminRoutes(options));
  app.use('/api/v1', api);

  app.use((_req, _res, next) => next(new ApiError(404, 'not_found', 'No such endpoint.')));
  app.use(errorHandler);
  return app;
}
