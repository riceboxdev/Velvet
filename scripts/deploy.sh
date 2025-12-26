#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Velvet Deployment Script${NC}"
echo "=============================="

# Navigate to project directory
cd /var/www/velvet

# Pull latest changes
echo -e "${YELLOW}📥 Pulling latest changes...${NC}"
git pull origin main

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
cd server
npm ci --production
cd ..

# Install client dependencies and build
echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
cd client-nuxt
pnpm install --frozen-lockfile
echo -e "${YELLOW}🔨 Building Nuxt production bundle...${NC}"
pnpm run build
cd ..

# Create logs directory if not exists
mkdir -p logs

# Restart PM2 processes
echo -e "${YELLOW}🔄 Restarting services...${NC}"
pm2 reload ecosystem.config.cjs --update-env

# Save PM2 process list
pm2 save

echo -e "${GREEN}✅ Deployment complete!${NC}"
pm2 status
