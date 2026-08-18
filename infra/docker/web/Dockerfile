# Dockerfile for Joblane Web (Next.js)
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml ./

# Copy package files (package-lock.json may not exist yet)
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/

# Copy package source files
COPY packages/ui ./packages/ui
COPY packages/contracts ./packages/contracts
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config

# Install dependencies
    RUN pnpm install --ignore-scripts && \
        ls -la apps/web/node_modules/@joblane/ 2>/dev/null || echo "@joblane not found in node_modules" && \
        ls -la apps/web/node_modules/@joblane/ui 2>/dev/null || echo "@joblane/ui not found in node_modules"

# Copy application code
    COPY apps/web ./apps/web

# Build the application
RUN cd apps/web && pnpm run build

# Production image
FROM node:22-alpine AS runner

# Set working directory
WORKDIR /app

# Copy built files from builder (standalone output)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/static ./.next/static

# Expose port
EXPOSE 1111

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:1111', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); })" || exit 1

# Command to run the application
CMD ["node", "server.js"]