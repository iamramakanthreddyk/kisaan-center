/**
 * Authentication Utilities
 * JWT token management, password hashing, and authentication helpers
 */

import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { USER_ROLES, ROLE_PERMISSIONS, PERMISSIONS } from '../constants';

/**
 * JWT Payload Interface
 */
export interface JWTPayload {
  userId: number;
  username: string;
  role: string;
  shopId?: number;
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * Token Configuration
 */
export interface TokenConfig {
  secret: string;
  expiresIn: string | number;
  refreshExpiresIn: string | number;
  issuer?: string;
  audience?: string;
}

/**
 * Password Hash Result
 */
export interface PasswordHashResult {
  hash: string;
  salt: string;
}

/**
 * JWT Token Manager
 */
export class JWTManager {
  private config: TokenConfig;

  constructor(config: TokenConfig) {
    this.config = config;
  }

  /**
   * Generate access token
   */
  generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    if (!this.config.secret) {
      throw new Error('JWT secret is not configured');
    }
    const options: jwt.SignOptions = {
  expiresIn: this.config.expiresIn as unknown as number | undefined,
      issuer: this.config.issuer,
      audience: this.config.audience
    };
    return jwt.sign(payload, this.config.secret, options);
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId: number): string {
    if (!this.config.secret) {
      throw new Error('JWT secret is not configured');
    }
    const refreshOptions: jwt.SignOptions = {
  expiresIn: this.config.refreshExpiresIn as unknown as number | undefined,
      issuer: this.config.issuer,
      audience: this.config.audience
    };
    return jwt.sign(
      { userId, type: 'refresh' },
      this.config.secret,
      refreshOptions
    );
  }

  /**
   * Verify and decode token
   */
  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience
      }) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    return Date.now() >= decoded.exp * 1000;
  }

  /**
   * Get token expiry time
   */
  getTokenExpiry(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  }
}

/**
 * Password Manager
 */
export class PasswordManager {
  private readonly saltRounds: number;

  constructor(saltRounds: number = 12) {
    this.saltRounds = saltRounds;
  }

  /**
   * Hash password with salt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error('Password verification failed');
    }
  }

  /**
   * Generate random password
   */
  generateRandomPassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    // Ensure at least one character from each category
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');

  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 1;
    else feedback.push('Add special characters');

    // Common pattern checks
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Avoid repeating characters');

    if (!/123|abc|qwe|password|admin/i.test(password)) score += 1;
    else feedback.push('Avoid common patterns');

    return {
      score,
      feedback,
      isStrong: score >= 6
    };
  }
}

/**
 * Permission Manager
 */
export class PermissionManager {
  /**
   * Get permissions for role
   */
  static getRolePermissions(role: string): string[] {
    return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
  }

  /**
   * Check if user has permission
   */
  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // SuperAdmin has all permissions
    if (userPermissions.includes(PERMISSIONS.ADMIN_ALL)) {
      return true;
    }

    return userPermissions.includes(requiredPermission);
  }

  /**
  * Check if user has any of the permissions
   */
  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Check if user has all permissions
   */
  static hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.every(permission => 
      this.hasPermission(userPermissions, permission)
    );
  }

  /**
   * Filter permissions by resource
   */
  static getResourcePermissions(userPermissions: string[], resource: string): string[] {
    const resourcePrefix = `${resource}:`;
    return userPermissions.filter(permission => 
      permission.startsWith(resourcePrefix) || permission === PERMISSIONS.ADMIN_ALL
    );
  }

  /**
   * Check if user can access shop
   */
  static canAccessShop(userRole: string, userShopId: number | null, targetShopId: number): boolean {
    // SuperAdmin can access all shops
    if (userRole === USER_ROLES.SUPERADMIN) {
      return true;
    }

    // Owner can only access their own shop
    if (userRole === USER_ROLES.OWNER) {
      return userShopId === targetShopId;
    }

    // Farmers and buyers can only access their assigned shop
    return userShopId === targetShopId;
  }
}

/**
 * Session Manager
 */
export class SessionManager {
  private activeSessions: Map<string, JWTPayload> = new Map();

  /**
   * Create session
   */
  createSession(sessionId: string, payload: JWTPayload): void {
    this.activeSessions.set(sessionId, payload);
  }

  /**
   * Get session
   */
  getSession(sessionId: string): JWTPayload | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Update session
   */
  updateSession(sessionId: string, payload: Partial<JWTPayload>): boolean {
    const existingSession = this.activeSessions.get(sessionId);
    if (!existingSession) return false;

    this.activeSessions.set(sessionId, { ...existingSession, ...payload });
    return true;
  }

  /**
   * Destroy session
   */
  destroySession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }

  /**
   * Destroy all user sessions
   */
  destroyUserSessions(userId: number): number {
    let destroyedCount = 0;
    
    for (const [sessionId, payload] of this.activeSessions.entries()) {
      if (payload.userId === userId) {
        this.activeSessions.delete(sessionId);
        destroyedCount++;
      }
    }
    
    return destroyedCount;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get user sessions
   */
  getUserSessions(userId: number): Array<{ sessionId: string; payload: JWTPayload }> {
    const userSessions: Array<{ sessionId: string; payload: JWTPayload }> = [];
    
    for (const [sessionId, payload] of this.activeSessions.entries()) {
      if (payload.userId === userId) {
        userSessions.push({ sessionId, payload });
      }
    }
    
    return userSessions;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions(): number {
    let cleanedCount = 0;
    const now = Date.now() / 1000;
    
    for (const [sessionId, payload] of this.activeSessions.entries()) {
      if (payload.exp && payload.exp < now) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}

/**
 * Utility Functions
 */
export class AuthUtils {
  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate API key
   */
  static generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash API key for storage
   */
  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Create JWT payload from user data
   */
  static createJWTPayload(user: {
    id: number;
    username: string;
    role: string;
    shop_id?: number;
  }): Omit<JWTPayload, 'iat' | 'exp'> {
    return {
      userId: user.id,
      username: user.username,
      role: user.role,
      shopId: user.shop_id || undefined,
      permissions: PermissionManager.getRolePermissions(user.role)
    };
  }

  /**
   * Extract bearer token from authorization header
   */
  static extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }

  /**
   * Rate limiting helper
   */
  static createRateLimiter() {
    const attempts = new Map<string, { count: number; resetTime: number }>();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return {
      isAllowed: (identifier: string): boolean => {
        const now = Date.now();
        const userAttempts = attempts.get(identifier);

        if (!userAttempts || now > userAttempts.resetTime) {
          attempts.set(identifier, { count: 1, resetTime: now + windowMs });
          return true;
        }

        if (userAttempts.count >= maxAttempts) {
          return false;
        }

        userAttempts.count++;
        return true;
      },
      
      reset: (identifier: string): void => {
        attempts.delete(identifier);
      },
      
      getAttempts: (identifier: string): number => {
        const userAttempts = attempts.get(identifier);
        return userAttempts?.count || 0;
      }
    };
  }
}

/**
 * Export configured instances
 */
export const authUtils = AuthUtils;
export const permissionManager = PermissionManager;