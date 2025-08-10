# Frontend multi-stage Dockerfile (Vite + NGINX)

# 1) Builder: install deps and build static assets
FROM node:20-alpine AS builder
WORKDIR /app
ENV CI=true

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

# 2) Runtime: serve with NGINX
FROM nginx:1.27-alpine AS runtime

# Remove default nginx static content
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Basic NGINX config (gzip, caching can be added later)
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

# Optional: custom nginx.conf can be mounted or added here

