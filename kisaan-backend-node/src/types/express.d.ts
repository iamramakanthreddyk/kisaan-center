import { UserRole } from '../schemas/user';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: UserRole;
        shop_id?: number | null;
      };
    }
  }
}

export {};
