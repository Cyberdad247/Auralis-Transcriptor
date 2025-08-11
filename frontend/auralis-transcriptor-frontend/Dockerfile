# Frontend multi-stage Dockerfile (Vite)

# Development stage: run Vite dev server
FROM node:20-alpine AS development
WORKDIR /app
ENV CI=true

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "--port", "3000"]

# Production build stage: build static assets
FROM node:20-alpine AS builder
WORKDIR /app
ENV CI=true

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production runtime: serve static files with NGINX
FROM nginx:1.27-alpine AS runtime

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
