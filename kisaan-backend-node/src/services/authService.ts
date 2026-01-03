import { UserRepository } from '../repositories/UserRepository';
import { PasswordManager } from '../shared/utils/auth';
import jwt from 'jsonwebtoken';
import { LoginInput } from '../schemas/auth';
import { ValidationError, AuthorizationError, DatabaseError } from '../shared/utils/errors';
import { StringFormatter } from '../shared/utils/formatting';

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
      console.log(`[DEBUG] User lookup result: ${!!user}`);
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

      // Generate JWT token (no expiration - only expires on logout)
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          role: user.role,
          shop_id: shopId ?? null
        },
        JWT_SECRET
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
  verifyToken(token: string): unknown {
    try {
      if (!token?.trim()) {
        throw new ValidationError('Token is required');
      }

      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthorizationError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthorizationError('Token expired');
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
