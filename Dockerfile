FROM node:18-alpine AS backend-build

WORKDIR /app

# Install dependencies and build backend
COPY kisaan-backend-node/package*.json ./
RUN npm ci --production=false
COPY kisaan-backend-node/ .
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app

# Copy built backend
COPY --from=backend-build /app/dist ./
COPY --from=backend-build /app/package.json ./

ENV NODE_ENV=production

EXPOSE 3000

# Start the Node backend
CMD ["node", "dist/src/server.js"]