import type { UserRecord } from '../db/queries/userQueries';

// This file extends the Express Request interface to include custom properties for user authentication. 
// It allows us to attach the authenticated user's information and session ID to the request object, making it accessible in our route handlers and middleware without needing to redefine these properties in every file. 
declare global {
    namespace Express {
        interface Request {
            user?: UserRecord;
            sessionId?: string;
            file?: Multer.File;
        }
    }
}

export {};
