# Auralis Transcriptor Backend Dockerfile
FROM node:20-alpine AS base

# Install FFmpeg and build deps
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    make \
    g++

WORKDIR /app
ENV NODE_ENV=production

# Pre-create runtime dirs
RUN mkdir -p uploads temp logs

# Install only production deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source
COPY src/ ./src/

# Create non-root user and set ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S auralis -u 1001 -G nodejs && \
    chown -R auralis:nodejs /app
USER auralis

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]
