FROM node:22-alpine
WORKDIR /app

# Copy entire monorepo
COPY . .

# Install all dependencies
RUN npm ci

EXPOSE 3001
ENV NODE_ENV=production

CMD ["npx", "tsx", "apps/api/src/index.ts"]
