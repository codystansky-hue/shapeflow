FROM node:22-alpine
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

EXPOSE 3001
ENV NODE_ENV=production

# Run directly with tsx (no build step needed)
CMD ["npx", "tsx", "apps/api/src/index.ts"]
