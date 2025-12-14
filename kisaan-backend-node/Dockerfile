# Node.js Dockerfile for KisaanCenter Backend
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files from backend directory (context root expected at repo root)
COPY kisaan-backend-node/package*.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy backend source code only
COPY kisaan-backend-node/. ./

# Build TypeScript to JavaScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install necessary system packages
RUN apk add --no-cache \
    postgresql-client \
    curl \
    dumb-init

# Create app directory
WORKDIR /app

# Copy package files and lockfile from build stage (guarantees lock is present)
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./

# Install only production dependencies using the lockfile
RUN npm ci --only=production

# Copy built application from build stage
COPY --from=build /app/dist ./dist

# Copy schema files so unified-schema.sql is available at runtime
COPY --from=build /app/schema ./dist/schema

# Copy migrations so runtime can discover SQL/TS migrations
COPY --from=build /app/src/migrations ./dist/src/migrations

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    chown -R appuser:nodejs /app

USER appuser

# Expose port
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the application
CMD ["npm", "start"]