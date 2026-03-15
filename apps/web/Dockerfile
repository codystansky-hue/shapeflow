FROM node:22-alpine AS builder
WORKDIR /app

# Copy workspace root
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install all deps
RUN npm ci

# Copy source
COPY packages/shared/ ./packages/shared/
COPY apps/web/ ./apps/web/

# Build
RUN npm run build -w apps/web

# Serve with a lightweight static server
FROM node:22-alpine
RUN npm install -g serve
WORKDIR /app
COPY --from=builder /app/apps/web/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
