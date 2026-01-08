import { UserSession } from '../models/userSession';
import { FeatureService } from './featureService';
import { Op } from 'sequelize';

export interface SessionInfo {
  jti: string;
  userId: number;
  expiresAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class SessionService {
  /**
   * Create a new session for user
   */
  static async createSession(sessionInfo: SessionInfo): Promise<UserSession> {
    return await UserSession.create({
      user_id: sessionInfo.userId,
      jti: sessionInfo.jti,
      device_info: sessionInfo.deviceInfo,
      ip_address: sessionInfo.ipAddress,
      user_agent: sessionInfo.userAgent,
      expires_at: sessionInfo.expiresAt,
      is_active: true,
    });
  }

  /**
   * Validate if session is active and not expired
   */
  static async validateSession(jti: string): Promise<boolean> {
    const session = await UserSession.findOne({
      where: {
        jti,
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    return !!session;
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(jti: string): Promise<boolean> {
    const [affectedRows] = await UserSession.update(
      { is_active: false },
      { where: { jti } }
    );
    return affectedRows > 0;
  }

  /**
   * Invalidate all sessions for a user (except current if specified)
   */
  static async invalidateUserSessions(userId: number, exceptJti?: string): Promise<number> {
    const whereClause: any = {
      user_id: userId,
      is_active: true,
    };

    if (exceptJti) {
      whereClause.jti = { [Op.ne]: exceptJti };
    }

    const [affectedRows] = await UserSession.update(
      { is_active: false },
      { where: whereClause }
    );

    return affectedRows;
  }

  /**
   * Get active session count for user
   */
  static async getActiveSessionCount(userId: number): Promise<number> {
    return await UserSession.count({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
    });
  }

  /**
   * Check if user can have multiple sessions based on features
   */
  static async canHaveMultipleSessions(userId: number): Promise<boolean> {
    try {
      const features = await FeatureService.getEffectiveFeatures(userId);
      return features.features['auth.multiple_sessions'] || false;
    } catch (error) {
      console.error('Error checking multiple sessions feature:', error);
      return false; // Default to single session
    }
  }

  /**
   * Handle login session management
   * Creates new session and invalidates old ones if needed
   */
  static async handleLoginSession(
    userId: number,
    jti: string,
    expiresAt: Date,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const canMultipleSessions = await this.canHaveMultipleSessions(userId);

    if (!canMultipleSessions) {
      // Invalidate all existing sessions for this user
      await this.invalidateUserSessions(userId);
    }

    // Create new session
    await this.createSession({
      userId,
      jti,
      expiresAt,
      deviceInfo,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const [affectedRows] = await UserSession.update(
      { is_active: false },
      {
        where: {
          is_active: true,
          expires_at: { [Op.lt]: new Date() },
        },
      }
    );

    return affectedRows;
  }

  /**
   * Get user's active sessions
   */
  static async getUserActiveSessions(userId: number): Promise<UserSession[]> {
    return await UserSession.findAll({
      where: {
        user_id: userId,
        is_active: true,
        expires_at: { [Op.gt]: new Date() },
      },
      order: [['created_at', 'DESC']],
    });
  }
}

export default SessionService;