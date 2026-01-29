#!/bin/sh

# Start Nginx in background
nginx

# Start Node Server
# Assuming WORKDIR is /app/server
cd /app/server
# Ensure DB migrations could run here if needed, but for now just start
# npx prisma migrate deploy # Uncomment if schema changes
npm run start-production
