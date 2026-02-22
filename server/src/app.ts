import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';
import { authRouter } from './routes/authRoutes';
import { healthRouter } from './routes/healthRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.APP_URL,
      credentials: true
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);

  if (env.NODE_ENV === 'production') {
    const candidates = [
      path.resolve(process.cwd(), 'client/dist'),
      path.resolve(process.cwd(), '../client/dist'),
      path.resolve(__dirname, '../../client/dist')
    ];
    const clientDistPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (!clientDistPath) {
      throw new Error('Unable to locate client build output directory.');
    }

    app.use(express.static(clientDistPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  app.use(errorMiddleware);
  return app;
}
