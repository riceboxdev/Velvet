---
description: Deploy Velvet to VPS using Dokploy
---

# Dokploy Deployment Workflow

## Prerequisites
- Dokploy installed on your VPS (already done ✅)
- GitHub repo with Velvet code
- Domain DNS pointing to VPS IP

---

## Initial Setup in Dokploy UI

### 1. Access Dokploy
Open `https://YOUR_VPS_IP:3000` in browser and login.

### 2. Create a Project
1. Click **Create Project**
2. Name it `Velvet`

### 3. Add Docker Compose Service
1. Inside the Velvet project, click **Add Service** → **Docker Compose**
2. Choose **GitHub** as source
3. Connect your GitHub account and select the `VELVET` repository
4. Set branch to `main`
5. Compose Path: `docker-compose.yml` (root of repo)

### 4. Configure Environment Variables
Go to **Environment** tab and add:

#### API Service Variables:
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
CORS_ORIGIN=https://velvetapi.com,https://www.velvetapi.com
STRIPE_SECRET_KEY=sk_live_...
SENDGRID_API_KEY=SG....
```

#### Web Service Variables:
```env
NUXT_PUBLIC_API_HOST=https://api.velvetapi.com
NUXT_PUBLIC_FIREBASE_API_KEY=your-key
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NUXT_PUBLIC_FIREBASE_APP_ID=1:123:web:abc
```

### 5. Configure Domain
1. Go to **Domains** tab in Dokploy
2. Add domains for each service:
   - `api.velvetapi.com` → api service
   - `velvetapi.com` → web service
   - `www.velvetapi.com` → web service

Dokploy uses Traefik and automatically provisions SSL certificates via Let's Encrypt.

### 6. Deploy
Click **Deploy** button. Dokploy will:
1. Pull code from GitHub
2. Build Docker images
3. Start containers
4. Configure Traefik routing

---

## Auto-Deploy on Push

Dokploy provides a webhook URL for each service:

1. Go to **Deployments** tab in your Docker Compose service
2. Copy the **Webhook URL**
3. In GitHub repo → Settings → Webhooks → Add webhook
4. Paste the URL, set content type to `application/json`
5. Select "Just the push event"

Now every push to `main` triggers automatic deployment!

---

## Useful Commands

### View Logs
In Dokploy UI → **Logs** tab, select the service (api or web)

### Manual Deploy
Click **Deploy** in the Dokploy UI, or push to `main` branch

### Restart Services
In Dokploy UI → **General** tab → **Restart**

---

## Monitoring
Dokploy provides built-in monitoring:
- Go to **Monitoring** tab
- View CPU, Memory, Disk, and Network usage per service
