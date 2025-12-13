import { Router } from 'express';

const router = Router();

router.get('/test', (req, res) => {
  console.log('✅ TEST: Product test route hit!');
  res.json({ 
    message: 'Product test route working!',
    timestamp: new Date().toISOString(),
    route: '/api/products/test'
  });
});

router.get('/', (req, res) => {
  console.log('✅ TEST: Product list route hit!');
  res.json({ 
    message: 'Product list working!',
    products: [],
    timestamp: new Date().toISOString(),
    route: '/api/products'
  });
});

export default router;
