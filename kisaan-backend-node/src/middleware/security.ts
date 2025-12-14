import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import { Application, Request, Response, json, urlencoded } from 'express';
import { env } from '../config/env';

// Build CORS origins list
function buildCorsOrigins(): Array<string | RegExp> {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080'
  ];
  const extraRaw = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const extra = extraRaw.map((entry) => {
    // Regex entry prefixed with r:
    if (entry.startsWith('r:')) {
      try { return new RegExp(entry.slice(2)); } catch { return entry; }
    }
    // Wildcard support like *.vercel.app or https://*.vercel.app
    if (entry.includes('*')) {
      // Escape dots and slashes, replace * with [^/]+ to match a single host segment
      const pattern = entry
        .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
        .replace(/\\\*/g, '[^/]+');
      try { return new RegExp(`^${pattern}$`); } catch { return entry; }
    }
    return entry;
  });

  return Array.from(new Set([...defaults, ...extra]));
}

export interface SecurityOptions {
  enableRateLimit?: boolean;
  requestsPerWindow?: number;
  windowMs?: number;
}

export function applySecurity(app: Application, opts: SecurityOptions = {}) {
  const {
    enableRateLimit = env.NODE_ENV === 'production',
    requestsPerWindow = 300,
    windowMs = 15 * 60 * 1000
  } = opts;

  // Helmet baseline
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
  }));

  // CORS
  const corsOrigins = buildCorsOrigins();
  // origin as function to handle dynamic matching of RegExp and strings
  const originMatcher = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true); // allow non-browser clients (e.g., curl)
    for (const o of corsOrigins) {
      if (typeof o === 'string' && o === origin) return cb(null, true);
      if (o instanceof RegExp && o.test(origin)) return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'), false);
  };

  const corsOptions: CorsOptions = {
    origin: originMatcher,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  };
  app.use(cors(corsOptions));
  // Ensure preflight requests are handled with the same CORS options
  app.options('*', cors(corsOptions));

  // Compression (optional if dependency installed)
  try {
    // Dynamic import for optional dependency
    import('compression').then((compressionModule) => {
      app.use(compressionModule.default());
    }).catch(() => {
      app.get('/__warn/compression', (_req, res) => res.json({ warning: 'compression module not installed' }));
    });
  } catch {
    app.get('/__warn/compression', (_req, res) => res.json({ warning: 'compression module not installed' }));
  }

  // Body parsers (centralized) - large enough for file uploads but not excessive
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting (simple in-memory). For clustering or multiple instances, replace with Redis store.
  if (enableRateLimit) {
    try {
      // Dynamic import for optional dependency
      import('express-rate-limit').then((rateLimitModule) => {
        const rateLimit = rateLimitModule.default;
        app.use('/api/', rateLimit({
          windowMs,
          max: requestsPerWindow,
          standardHeaders: true,
          legacyHeaders: false,
          handler: (req: Request, res: Response) => {
            if ('log' in req && typeof req.log?.warn === 'function') {
              req.log.warn({ ip: req.ip }, 'rate limit exceeded');
            }
            return res.status(429).json({ success: false, error: 'Too many requests, please try again later.' });
          }
        }));
      }).catch(() => {
        app.get('/__warn/ratelimit', (_req, res) => res.json({ warning: 'express-rate-limit module not installed' }));
      });
    } catch {
      app.get('/__warn/ratelimit', (_req, res) => res.json({ warning: 'express-rate-limit module not installed' }));
    }
  }
}
