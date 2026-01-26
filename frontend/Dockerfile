# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# =============================================================================
# Dependencies stage
# =============================================================================
FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# =============================================================================
# Build stage
# =============================================================================
FROM base AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables
ARG NEXT_PUBLIC_API_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =============================================================================
# Production stage - serve static export
# =============================================================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    npm install -g serve

# Copy static export output
COPY --from=builder --chown=nextjs:nodejs /app/out ./out

USER nextjs

EXPOSE 7860

# Serve static files
CMD ["serve", "-s", "out", "-l", "7860"]
