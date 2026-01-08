import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user';

/**
 * Middleware to track user activity
 * Updates last_activity timestamp for authenticated users
 */
export async function trackUserActivity(req: Request, res: Response, next: NextFunction) {
  try {
    // Only track for authenticated requests
    const user = (req as any).user;
    if (user && user.id) {
      // Update last_activity asynchronously (don't block the request)
      User.update(
        { last_activity: new Date() },
        { where: { id: user.id } }
      ).catch(error => {
        console.warn('Failed to update user activity:', error);
      });
    }
  } catch (error) {
    // Don't fail the request if activity tracking fails
    console.warn('Activity tracking error:', error);
  }

  next();
}