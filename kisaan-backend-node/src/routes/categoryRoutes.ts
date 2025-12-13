import { Router } from 'express';
import { CategoryController } from '../controllers';
import { requireSuperadmin } from '../middleware/requireSuperadmin';
import { authenticateToken } from '../middlewares/auth';

export const categoryRoutes = Router();

const categoryController = new CategoryController();

// Apply authentication to protected routes
categoryRoutes.put('/:id', authenticateToken, requireSuperadmin, categoryController.updateCategory.bind(categoryController));
categoryRoutes.delete('/:id', authenticateToken, requireSuperadmin, categoryController.deleteCategory.bind(categoryController));
categoryRoutes.post('/', authenticateToken, requireSuperadmin, categoryController.createCategory.bind(categoryController));

// Public routes (no authentication needed)
categoryRoutes.get('/', categoryController.getAllCategories.bind(categoryController));
// Simplified: removed /active and /search endpoints (status & advanced search removed)
categoryRoutes.get('/:id', categoryController.getCategoryById.bind(categoryController));

// Add route logging middleware
categoryRoutes.use((req, res, next) => {
  console.log(`Category route: ${req.method} ${req.path}`);
  next();
});
