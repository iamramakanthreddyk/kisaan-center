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
