import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';

// A middleware function to handle errors in Express applications. It checks the type of error and responds with the appropriate HTTP status code and message.
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {

    // If the error is a ZodError (validation error), respond with a 400 Bad Request and the first validation issue message.
    if (err instanceof ZodError) {
        return res.status(400).json({ message: err.issues[0]?.message ?? 'Invalid request.' });
    }

    // If the error is an HttpError (custom application error), respond with the status code and message defined in the error.
    if (err instanceof HttpError) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    if (err instanceof MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Image files must be 5 MB or smaller.'
            : 'Unable to process uploaded image.';

        return res.status(400).json({ message });
    }

    // For any other types of errors, log the error and respond with a 500 Internal Server Error.
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
}
