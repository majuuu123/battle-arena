# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# Production stage
FROM node:20-alpine

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src

# Give ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3002
CMD ["node", "src/index.js"]