FROM node:22 AS builder

# Install Wasp
RUN curl -sSL https://get.wasp.sh/installer.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy the Wasp app
COPY waitlist-api/app/main.wasp .
COPY waitlist-api/app/.wasproot .
COPY waitlist-api/app/.waspignore .
COPY waitlist-api/app/package.json .
COPY waitlist-api/app/package-lock.json .
COPY waitlist-api/app/schema.prisma .
COPY waitlist-api/app/tsconfig.json .
COPY waitlist-api/app/vite.config.ts .
COPY waitlist-api/app/.env.server.example .env.server

# Copy source code
COPY waitlist-api/app/src ./src
COPY waitlist-api/app/public ./public

# Build the Wasp app
RUN wasp build

# The second stage uses the built node app
FROM node:22-alpine

# Install Nginx
RUN apk add --no-cache nginx

# Install Prisma globally (required for Wasp/Prisma runtime operations)
RUN npm install -g prisma

# Create necessary directories
WORKDIR /app

# Copy the built app from the builder stage
# Copy explicit folders to ensure structure is correct
COPY --from=builder /app/.wasp/build/server ./server
COPY --from=builder /app/.wasp/build/web-app ./web-app

# Copy Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf
RUN mkdir -p /run/nginx

# Copy start script
COPY start.sh .
RUN chmod +x start.sh

# Install production dependencies for server
WORKDIR /app/server
RUN npm install --omit=dev

# Expose port 3005 (Nginx)
EXPOSE 3005

# Internal Node port (used by Nginx proxy)
ENV PORT=3000

# Start via script
CMD ["/app/start.sh"]
