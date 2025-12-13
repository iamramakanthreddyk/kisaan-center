import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { apiRegistry } from './core/apiRegistry';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models to ensure they're initialized
import './models';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000',
    'http://localhost:8080',
    ...(process.env.CORS_ORIGINS?.split(',') || [])
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  
  // Special logging for key endpoints
  if (req.path.startsWith('/api/products')) {
    console.log('🔍 PRODUCTS REQUEST DETECTED:', req.method, req.path);
  }
  if (req.path.startsWith('/api/transactions')) {
    console.log('🔍 TRANSACTIONS REQUEST DETECTED:', req.method, req.path);
  }
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'KisaanCenter Backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    apiModules: apiRegistry.getModules().length,
    totalEndpoints: apiRegistry.getAllEndpoints().length
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const openApiSpec = apiRegistry.getOpenApiSpec();
  res.json(openApiSpec);
});

// API Discovery endpoint - dynamically lists all available endpoints
app.get('/api/test', (req, res) => {
  const modules = apiRegistry.getModules();
  const summary = {
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    version: '2.0.0 - Dynamic API Registry',
    totalModules: modules.length,
    totalEndpoints: apiRegistry.getAllEndpoints().length,
    modules: modules.map(module => ({
      name: module.name,
      prefix: `/api${module.prefix}`,
      description: module.description,
      endpoints: module.endpoints.length
    })),
    registryInfo: 'All endpoints are now dynamically discovered and registered'
  };
  
  res.json(summary);
});

// Register all API routes dynamically using the API Registry
console.log('🚀 Initializing API Registry...');
try {
  apiRegistry.registerRoutes(app);
  console.log(apiRegistry.generateSummary());
} catch (error) {
  console.error('❌ Error registering API routes:', error);
  process.exit(1);
}

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response) => {
  let message = 'Something went wrong';
  if (process.env.NODE_ENV === 'development') {
    if (typeof err === 'object' && err !== null && 'message' in err) {
      message = (err as { message?: string }).message || message;
    } else if (typeof err === 'string') {
      message = err;
    }
  }
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler - now dynamically generated
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  // Generate available routes dynamically from registry
  const availableRoutes = ['GET /health', 'GET /api/test', 'GET /api/docs'];
  
  for (const module of apiRegistry.getModules()) {
    const baseRoute = `/api${module.prefix}`;
    availableRoutes.push(
      `GET ${baseRoute}`,
      `POST ${baseRoute}`,
      `GET ${baseRoute}/:id`,
      `PUT ${baseRoute}/:id`,
      `DELETE ${baseRoute}/:id`
    );
  }
  
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Visit /api/test for a complete list of available endpoints',
    documentation: 'Visit /api/docs for OpenAPI specification',
    availableModules: apiRegistry.getModules().map(m => `/api${m.prefix}`),
    totalEndpoints: apiRegistry.getAllEndpoints().length
  });
});

export default app;