import type { UserRecord } from '../db/queries/userQueries';

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
      sessionId?: string;
    }
  }
}

export {};
