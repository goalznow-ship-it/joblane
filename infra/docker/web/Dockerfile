# Dockerfile for Joblane Web (Next.js)
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
COPY packages/ui/package.json packages/ui/package-lock.json ./packages/ui/

# Install dependencies
RUN npm install -g pnpm && \
    cd apps/web && pnpm install --frozen-lockfile && \
    cd ../.. && cd packages/ui && pnpm install --frozen-lockfile

# Copy application code
COPY apps/web ./apps/web
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY packages/shared ./packages/shared

# Build the application
RUN cd apps/web && pnpm run build

# Production image
FROM node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/apps/web/next.config.js ./apps/web/next.config.js
COPY --from=builder /app/apps/web/.env.example ./apps/web/.env.example

# Install production dependencies
RUN cd apps/web && pnpm install --prod --frozen-lockfile && \
    rm -rf node_modules/.cache

# Copy built application
COPY --from=builder /app/apps/web/.next/standalone ./apps/web
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })" || exit 1

# Command to run the application
CMD ["node", "apps/web/server.js"]