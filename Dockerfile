FROM node:22 AS builder

# Install Wasp
RUN curl -sSL https://get.wasp.sh/installer.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy the Wasp app
COPY waitlist-api/app/main.wasp .
COPY waitlist-api/app/package.json .
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

WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app/.wasp/build .

# Install production dependencies
RUN npm install --omit=dev

EXPOSE 3000

ENV PORT=3000
CMD ["npm", "start"]
