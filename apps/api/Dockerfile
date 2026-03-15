FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Install all deps
RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Build
RUN npm run build -w apps/api

# Production image
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
