import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env';
import { authRouter } from './routes/authRoutes';
import { healthRouter } from './routes/healthRoutes';
import { listRouter } from './routes/listRoutes';
import { listingRouter } from './routes/listingRoutes';
import { notificationPreferenceRouter } from './routes/notificationPreferenceRoutes';
import { errorMiddleware } from './middleware/errorMiddleware';

export function createApp() {

    // Create an Express application instance.
    const app = express();

    // Configure CORS to allow requests from the frontend application URL and include credentials (cookies) in cross-origin requests.
    app.use(
        cors({
        origin: env.APP_URL,
        credentials: true
        })
    );

    app.use(express.json());
    app.use(cookieParser());

    // Register API routes for health checks and authentication under the '/api' path.
    app.use('/api', healthRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/lists', listRouter);
    app.use('/api/listings', listingRouter);
    app.use('/api/notification-preferences', notificationPreferenceRouter);

    // In production, serve the React frontend from the 'client/dist' directory. 
    // It checks multiple candidate paths to locate the client build output directory, ensuring compatibility with different project structures. 
    // If the directory is found, it serves static files and handles all other routes by sending the 'index.html' file, allowing React Router to manage client-side routing.
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

    // Register the error handling middleware. This should be registered after all other routes and middleware to catch any errors that occur during request processing.
    app.use(errorMiddleware);
    return app;
}
