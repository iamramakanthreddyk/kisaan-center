import { Router } from 'express';
import { loginController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/auth';
import { AuthService } from '../services/authService';

const router = Router();
const authService = new AuthService();

router.options('/login', (req, res) => {
  res.sendStatus(204);
});
router.post('/login', loginController);
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Extract JTI from token if available
    const authHeader = req.headers.authorization;
    let jti: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = await authService.verifyToken(token) as any;
        jti = decoded.jti;
      } catch (error) {
        // Token might be invalid, but continue with logout
        console.warn('Could not extract JTI from token during logout:', error);
      }
    }

    // Invalidate session if JTI is available
    if (jti) {
      await import('../services/sessionService').then(({ SessionService }) =>
        SessionService.invalidateSession(jti!)
      );
    }

    const result = await authService.logout();
    // Send explicit logout response
    res.json({
      success: true,
      message: 'Logout successful',
      instruction: 'Clear token from localStorage/sessionStorage on client'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});


export default router;
export { router as authRoutes };
