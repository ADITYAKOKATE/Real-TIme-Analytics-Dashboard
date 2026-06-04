FROM node:20-alpine AS builder
WORKDIR /app

# Copy root and workspace package files
COPY package*.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (workspaces)
RUN npm ci

# Build shared package
COPY packages/shared ./packages/shared
RUN npm run build --workspace=packages/shared

# Build server app
COPY apps/server ./apps/server
RUN npm run build --workspace=apps/server

# Remove devDependencies to keep image small
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/apps/server/dist ./apps/server/dist

EXPOSE 4000

# Start the application
CMD ["npm", "run", "start", "--workspace=apps/server"]
