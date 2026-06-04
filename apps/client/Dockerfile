FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY apps/client/package.json ./apps/client/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN npm ci

# Build shared package
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Copy client source code
COPY apps/client ./apps/client

# Set environment variables needed during build
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_WS_URL=http://localhost:4000

# Build Next.js app in standalone mode
RUN npm run build --workspace=apps/client

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Next.js standalone output automatically copies necessary node_modules
# and traces dependencies. We just need to copy the standalone directory
# and static assets.
    # The Next.js app doesn't have a public directory, skipping.
COPY --from=builder /app/apps/client/.next/static ./apps/client/.next/static
COPY --from=builder /app/apps/client/.next/standalone/ ./

# The standalone build outputs to ./apps/client/server.js relative to the standalone folder
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/client/server.js"]
