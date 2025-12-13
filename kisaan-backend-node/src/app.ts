// Force execution of transaction model for registration side effects
import './models/transaction';
import express from 'express';
import { ErrorHandler } from './shared/utils/errors';
import dotenv from 'dotenv';
import path from 'path';
import { apiRegistry } from './core/apiRegistry';
import { requestContext } from './middleware/requestContext';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './shared/logging/logger';
import { applySecurity } from './middleware/security';
import { paginationParser } from './middleware/pagination';
import sequelize from './config/database';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models to ensure they're initialized
import './models';

const app = express();

// Remove framework signature
app.disable('x-powered-by');

// Attach per-request context (id + logger)
app.use(requestContext);

// Security & core middleware (helmet, cors, rate limit, compression, body parsers)
applySecurity(app);

// Pagination (applies to all API requests that may paginate)
app.use(paginationParser);

// Lightweight route category logging
app.use((req, _res, next) => {
  if (req.path.startsWith('/api/products')) {
    req.log?.debug({ path: req.path, method: req.method }, 'products request');
  } else if (req.path.startsWith('/api/transactions')) {
    req.log?.debug({ path: req.path, method: req.method }, 'transactions request');
  }
  next();
});

// Liveness probe (fast, no external deps)
app.get('/healthz', (_req, res) => {
  res.json({
    status: 'OK',
    ts: new Date().toISOString()
  });
});

// Backward compatible existing health (retained, could deprecate later)
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

// Readiness probe (checks DB and registry)
app.get('/readyz', async (req, res) => {
  const start = Date.now();
  try {
    await sequelize.query('SELECT 1');
    const durationMs = Date.now() - start;
    return res.json({
      status: 'READY',
      ts: new Date().toISOString(),
      db: 'up',
      registryModules: apiRegistry.getModules().length,
      totalEndpoints: apiRegistry.getAllEndpoints().length,
      latencyMs: durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - start;
    req.log?.error({ err }, 'readiness check failed');
    return res.status(503).json({
      status: 'DEGRADED',
      ts: new Date().toISOString(),
      db: 'down',
      error: (err instanceof Error ? err.message : 'unknown'),
      latencyMs: durationMs
    });
  }
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
    modules: modules.map((module: import('./core/apiRegistry').ApiModule) => ({
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
logger.info('Initializing API Registry...');
try {
  apiRegistry.registerRoutes(app);
  logger.info(apiRegistry.generateSummary());
} catch (error) {
  logger.error({ err: error }, 'Error registering API routes');
  process.exit(1);
}

// Legacy ErrorHandler (keep temporarily for specific shape) then unified errorHandler
app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof err === 'object' && err && 'alreadyHandled' in err) return next(err);
  const legacy = new ErrorHandler(process.env.NODE_ENV === 'development');
  const errorObj = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown error');
  const legacyResp = legacy.handleError(errorObj, undefined);
  if (typeof err === 'object' && err !== null) {
    (err as { legacyPayload?: unknown }).legacyPayload = legacyResp;
  }
  next(err);
});
app.use(errorHandler);

// 404 handler - now dynamically generated
app.use('*', (req, res) => {
  req.log?.warn({ method: req.method, url: req.originalUrl }, 'Route not found');
  
  // Generate available routes dynamically from registry
  const availableRoutes = ['GET /health', 'GET /api/test', 'GET /api/docs'];
  
  for (const module of apiRegistry.getModules() as import('./core/apiRegistry').ApiModule[]) {
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
    availableModules: apiRegistry.getModules().map((m: import('./core/apiRegistry').ApiModule) => `/api${m.prefix}`),
    totalEndpoints: apiRegistry.getAllEndpoints().length
  });
});

export default app;