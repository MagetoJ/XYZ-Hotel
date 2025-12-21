# Production Deployment Checklist

## Pre-Deployment ✓

### Code & Configuration
- [x] Branding updated: "Maria Havens" → "XYZ Hotel"
- [x] Theme colors updated: Amber (#f59e0b) → Blue (#3b82f6)
- [x] PWA manifest updated with XYZ Hotel branding
- [x] Environment variables configured for production
- [x] TypeScript configuration validated
- [x] Build scripts verified in package.json
- [x] Procfile created for process management
- [x] render.yaml created for infrastructure as code
- [x] .gitignore enhanced to prevent secrets leaking

### Dependencies
- [x] All dependencies listed in package.json
- [x] Server dependencies in server/package.json
- [x] No dev dependencies in production builds
- [x] Node version compatible (18+)

### Database
- [x] Migration scripts ready (server/src/migrations/)
- [x] Custom items support added via migration
- [x] Database URL configured for production
- [x] PostgreSQL 15 compatible

### Frontend
- [x] Vite build configured
- [x] PWA service worker configured
- [x] Static asset serving configured
- [x] CORS origins configured for production
- [x] API proxy configured for development only

### Backend
- [x] Express server configured
- [x] Static file serving from dist/client
- [x] Health check endpoint (/api/health) working
- [x] WebSocket support enabled
- [x] Environment configuration in place
- [x] Database connection pooling configured

---

## Render Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Prepare for Render production deployment"
git push origin main
```

### Step 2: Create Render Service
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Select the correct branch

### Step 3: Configure Service
- **Name**: `xyz-hotel-pos`
- **Environment**: Node
- **Build Command**: `npm run build`
- **Start Command**: `node server/dist/index.js`
- **Plan**: Standard (minimum recommended)

### Step 4: Set Environment Variables
Add to Render Dashboard:
```
NODE_ENV=production
PORT=10000
DATABASE_URL=<your_postgresql_url>
JWT_SECRET=<strong_secret_key>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=<your_email>
EMAIL_PASSWORD=<app_password>
EMAIL_FROM=XYZ Hotel <noreply@xyzhotel.com>
```

### Step 5: Deploy
- Click "Deploy" on Render Dashboard
- Monitor build logs
- Check deployment status

### Step 6: Run Initial Migrations
After successful deployment:
1. Open Render Shell
2. Run: `cd server && npm run migrate:prod`

### Step 7: Verify Deployment
- Check health endpoint: `https://your-app.onrender.com/api/health`
- Test login functionality
- Verify PWA manifest loads correctly

---

## Post-Deployment Verification ✓

### Endpoints to Test
- [ ] `GET /api/health` - Returns OK status
- [ ] `GET /` - Frontend loads correctly
- [ ] `POST /api/auth/login` - Authentication works
- [ ] `GET /api/categories` - API calls work
- [ ] `GET /api/products` - Product data accessible
- [ ] `POST /api/orders` - Order creation works

### Frontend Checks
- [ ] PWA manifest loads (DevTools → Application)
- [ ] Service worker registered (DevTools → Application → Service Workers)
- [ ] App icon displays correctly
- [ ] Theme colors match blue palette
- [ ] Responsive design works on mobile

### Backend Checks
- [ ] Logs show successful startup
- [ ] Database connection successful
- [ ] No TypeScript errors during build
- [ ] Static files serving correctly
- [ ] WebSocket connection works

### Security Checks
- [ ] No secrets visible in logs
- [ ] HTTPS enforced
- [ ] CORS headers correct
- [ ] JWT authentication working
- [ ] .env files not in git history

---

## Database Setup

### Initial Setup
1. PostgreSQL database created on Render
2. Connection string set as DATABASE_URL
3. Migrations ready to run

### First Time Initialization
```bash
# Run migrations
cd server && npm run migrate:prod

# Optional: Seed initial data
cd server && npm run seed:prod
```

### Default Credentials
After first deployment, use these to login:
- **Username**: MagetoJ
- **Password**: Jabez2026
- **Role**: superadmin

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Application logs for errors
- [ ] Database performance
- [ ] Response times
- [ ] No 5xx errors

### Weekly Reviews
- [ ] Disk usage
- [ ] Memory consumption
- [ ] Database backup status
- [ ] Update availability

### Monthly Tasks
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Database maintenance
- [ ] Performance optimization

---

## Rollback Plan

If deployment fails:
1. Check Render logs for error messages
2. Fix the issue locally
3. Commit and push to GitHub
4. Redeploy from Render Dashboard
5. If database is corrupted, restore from backup

---

## Performance Optimization

### Caching
- Static files: 1 year (JS/CSS)
- Images: 1 day
- API responses: 1 hour

### Database
- Connection pooling configured
- Indexes on frequently queried columns
- Query optimization in place

### Frontend
- Code splitting via Vite
- Service worker caching
- Image optimization

---

## Support & References

- Render Docs: https://render.com/docs
- Deployment Guide: See `RENDER_DEPLOYMENT.md`
- GitHub: https://github.com/YourOrg/xyz-hotel-pos

---

## Sign-off

- [ ] Deployment date: ________________
- [ ] Deployed by: ________________
- [ ] Approved by: ________________
- [ ] Notes: ________________

