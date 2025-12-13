import { Request, Response, NextFunction } from 'express';
import { LoginSchema } from '../schemas/auth';
import { AuthService } from '../services/authService';
import { validate, ValidationFailure } from '../shared/validation/validate';
import { success, failure } from '../shared/http/respond';
import { z } from 'zod';

class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async loginController(req: Request, res: Response, next: NextFunction) {
    try {
      req.log?.info({ bodyKeys: Object.keys(req.body || {}) }, 'auth:login attempt');
      const data = validate(LoginSchema, req.body);
      const result = await this.authService.loginUser(data);
      return success(res, result, { message: 'Login successful' });
    } catch (err: unknown) {
      req.log?.error({ err }, 'auth:login failed');
      if (err instanceof ValidationFailure || err instanceof z.ZodError) {
        return failure(res, 400, 'Validation failed', (err as { issues?: unknown }).issues);
      }
      return next(err);
    }
  }

  async logoutController() {
    // Implementation for logout
  }

  async refreshTokenController() {
    // Implementation for refresh token
  }

  async verifyController() {
    // Implementation for verify
  }
}

const authController = new AuthController();
export { authController };
export const loginController = authController.loginController.bind(authController);
