
declare global {
  namespace Express {
    interface Request {
      // Optional user payload attached by authentication middleware
      user?: {
        id: number;
        username: string;
        role: UserRole | string;
        shop_id: number | string;
        // add other user properties as needed
      };
    }
  }
}

export {};

