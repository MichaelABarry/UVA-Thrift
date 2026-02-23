import type { NextFunction, Request, RequestHandler, Response } from 'express';

// A utility function to wrap async route handlers and pass errors to the error handling middleware. 
// This allows you to write async route handlers without try/catch blocks, and any thrown errors will be properly handled by the error middleware.
export function asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
    return (req, res, next) => {
        void Promise.resolve(handler(req, res, next)).catch(next);
    };
}
