import { UserRepository } from '../repositories/UserRepository';
import { PasswordManager } from '../shared/utils/auth';
import jwt from 'jsonwebtoken';
import { LoginInput } from '../schemas/auth';
import { ValidationError, AuthorizationError, DatabaseError } from '../shared/utils/errors';
import { StringFormatter } from '../shared/utils/formatting';
import { SessionService } from './sessionService';
import { User } from '../models/user';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export interface LoginResponseDTO {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    shop_id?: number | null;
    firstname?: string;
    shop_name?: string | null;
  };
}

export class AuthService {
  private userRepository: UserRepository;
  private passwordManager: PasswordManager;

  constructor() {
    this.userRepository = new UserRepository();
    this.passwordManager = new PasswordManager();
  }

  async loginUser({ username, password }: LoginInput): Promise<LoginResponseDTO> {
    try {
      // Validate input
      if (!username?.trim()) {
        throw new ValidationError('Username is required');
      }
      if (!password?.trim()) {
        throw new ValidationError('Password is required');
      }

      // Sanitize username
      const sanitizedUsername = StringFormatter.sanitizeInput(username.trim());

      // Find user by username
      const user = await this.userRepository.findByUsername(sanitizedUsername);
      if (!user) {
        throw new AuthorizationError('Invalid username or password');
      }

      // Validate user data
      if (!user.password || !user.username || !user.role) {
        throw new DatabaseError('Invalid user data in database');
      }

      // Verify password
      const isPasswordValid = await this.passwordManager.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        throw new AuthorizationError('Invalid username or password');
      }

      // --- FIX: For owners, if shop_id is null, look up their shop and set shop_id ---
      let shopId = user.shop_id;
      let shopName: string | null = null;
      if (user.role === 'owner' && (!shopId || shopId === null)) {
        try {
          const { Shop } = await import('../models/shop');
          // Ensure owner_id is always a number for the query
          const shop = await Shop.findOne({ where: { owner_id: Number(user.id) } });
          if (shop) {
            shopId = shop.id;
            shopName = shop.name;
          }
        } catch (err) {
          console.error('Error fetching owner shop for login:', err);
        }
      } else if (shopId) {
        try {
          const { Shop } = await import('../models/shop');
          const shop = await Shop.findByPk(shopId);
          shopName = shop ? shop.name : null;
        } catch (err) {
          console.error('Error fetching shop name:', err);
        }
      }

      // Update user login tracking
      await User.update(
        {
          last_login: new Date(),
          login_count: (user.login_count || 0) + 1,
        },
        { where: { id: user.id } }
      );

      // Generate JTI for session management
      const jti = crypto.randomBytes(16).toString('hex');

      // Generate JWT token with JTI (expires in 24 hours)
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          shop_id: shopId ?? null,
          jti: jti
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Handle session management (invalidate old sessions if needed)
      await SessionService.handleLoginSession(
        user.id!,
        jti,
        expiresAt,
        undefined, // deviceInfo - can be added later from request
        undefined, // ipAddress - can be added later from request
        undefined  // userAgent - can be added later from request
      );

      return {
        token,
        user: {
          id: user.id!,
          username: user.username,
          role: user.role,
          shop_id: shopId ?? null,
          firstname: user.firstname ?? '',
          shop_name: shopName
        }
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        throw error;
      }
      throw new DatabaseError('Failed to authenticate user', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Verify a JWT token and return the decoded payload
   */
  async verifyToken(token: string): Promise<unknown> {
    try {
      if (!token?.trim()) {
        throw new ValidationError('Token is required');
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Check if token has JTI (newer tokens)
      if (decoded.jti) {
        const isSessionValid = await SessionService.validateSession(decoded.jti);
        if (!isSessionValid) {
          throw new AuthorizationError('Session invalidated');
        }
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthorizationError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthorizationError('Token expired');
      }
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new ValidationError('Invalid token format');
    }
  }

  /**
   * Generate a password hash
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (!password?.trim()) {
        throw new ValidationError('Password is required');
      }

      return await this.passwordManager.hashPassword(password);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to hash password', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Logout user - invalidate token
   */
  async logout(): Promise<{ success: boolean; message: string }> {
    try {
      // In JWT-based auth, logout happens on client by removing token
      // This is a confirmation endpoint
      return {
        success: true,
        message: 'Logged out successfully. Please remove your token from client storage.'
      };
    } catch (error) {
      throw new DatabaseError('Logout failed', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(password: string): boolean {
    if (!password || password.length < 6) {
      return false;
    }
    // Add more password strength validation as needed
    return true;
  }
}
