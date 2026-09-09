# syntax=docker/dockerfile:1.7

# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install exact dependencies
RUN npm ci

# Pass Vite environment variables as build arguments
ARG VITE_API_URL="http://localhost:8000/api/v1/"
ARG VITE_USE_MOCK="false"

ENV VITE_API_URL=$VITE_API_URL \
    VITE_USE_MOCK=$VITE_USE_MOCK

# Copy source code and build production bundle
COPY . .
RUN npm run build

# Stage 2: Production runtime stage with Nginx
FROM nginx:1.27-alpine AS runner

# Remove default Nginx welcome page and configs
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx SPA configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Ensure permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
